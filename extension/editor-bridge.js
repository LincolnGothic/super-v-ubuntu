// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {imageInfo, MAX_IMAGE_BYTES} from './core/image.js';

const frameLimit = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 256;

// Image data crosses anonymous pipes, never command arguments or scratch files.
// Keep a single editor alive, bounded output, and cancel it with the extension.
export class EditorBridge {
    constructor(directory, onCopy, onError) {
        this.directory = directory;
        this.onCopy = onCopy;
        this.onError = onError;
    }

    open(bytes, mime) {
        imageInfo(bytes, mime);
        this.close();
        const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.STDIN_PIPE |
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE});
        const child = launcher.spawnv(['/usr/bin/gjs', '-m',
            this.directory.get_child('editor.js').get_path(), '--pipe', mime]);
        const cancel = new Gio.Cancellable();
        this.child = child;
        this.cancel = cancel;
        const input = child.get_stdin_pipe();
        let offset = 0;
        // Unix pipe descriptors can be blocking. Writes no larger than
        // PIPE_BUF avoid blocking Shell while the GTK child initializes.
        const write = () => {
            if (offset === bytes.length) {
                input.close_async(GLib.PRIORITY_DEFAULT, cancel, (s, r) => {
                    try { s.close_finish(r); } catch { /* The editor may have closed. */ }
                });
                return;
            }
            const chunk = new GLib.Bytes(bytes.slice(offset, offset + 4096));
            input.write_bytes_async(chunk, GLib.PRIORITY_DEFAULT, cancel, (stream, result) => {
                try {
                    const written = stream.write_bytes_finish(result);
                    if (!written) throw new Error('Editor pipe closed');
                    offset += written;
                    write();
                } catch {
                    if (!cancel.is_cancelled()) {
                        this.close();
                        this.onError();
                    }
                }
            });
        };
        write();
        let buffer = '';
        let eof = false;
        let waited = false;
        const finish = () => {
            if (!eof || !waited || this.child !== child)
                return;
            this.child = this.cancel = null;
            cancel.cancel();
            if (!child.get_successful())
                this.onError();
        };
        const output = child.get_stdout_pipe();
        const read = () => output.read_bytes_async(65536, GLib.PRIORITY_DEFAULT, cancel, (stream, result) => {
            try {
                const chunk = stream.read_bytes_finish(result).get_data();
                if (!chunk.length) {
                    if (buffer.length)
                        throw new Error('Incomplete editor frame');
                    eof = true;
                    finish();
                    return;
                }
                buffer += new TextDecoder('utf-8', {fatal: true}).decode(chunk);
                let end;
                while ((end = buffer.indexOf('\n')) >= 0) {
                    if (end > frameLimit)
                        throw new Error('Oversized editor frame');
                    const frame = JSON.parse(buffer.slice(0, end));
                    buffer = buffer.slice(end + 1);
                    if (typeof frame.png !== 'string' || frame.png.length > frameLimit)
                        throw new Error('Invalid editor frame');
                    const edited = GLib.base64_decode(frame.png);
                    imageInfo(edited, 'image/png');
                    if (this.child === child && !cancel.is_cancelled())
                        this.onCopy(edited);
                }
                if (buffer.length > frameLimit)
                    throw new Error('Oversized editor frame');
                read();
            } catch {
                if (!cancel.is_cancelled()) {
                    this.close();
                    this.onError();
                }
            }
        });
        read();
        child.wait_async(null, (process, result) => {
            try {
                process.wait_finish(result);
                waited = true;
                finish();
            } catch { /* Process teardown must not reach Shell. */ }
        });
    }

    close() {
        this.cancel?.cancel();
        this.cancel = null;
        const child = this.child;
        this.child = null;
        child?.force_exit();
    }
}
