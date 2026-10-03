// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {imageInfo, MAX_IMAGE_BYTES} from './core/image.js';
import {MAX_OCR_TEXT_BYTES} from './core/export.js';
import {LineFrames} from './core/frames.js';

const frameLimit = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 256;

// Image data crosses anonymous pipes, never command arguments or scratch files.
// Keep a single editor alive, bounded output, and cancel it with the extension.
export class EditorBridge {
    constructor(directory, onCopy, onError, {onPin = () => {}, onText = () => {}} = {}) {
        this.directory = directory;
        this.onCopy = onCopy;
        this.onError = onError;
        this.onPin = onPin;
        this.onText = onText;
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
        const frames = new LineFrames(frameLimit);
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
                    frames.finish();
                    eof = true;
                    finish();
                    return;
                }
                for (const text of frames.push(chunk)) {
                    const frame = JSON.parse(text);
                    if (frame.action === 'copy-text') {
                        if (typeof frame.text !== 'string' || !frame.text || frame.text.includes('\0') ||
                            new TextEncoder().encode(frame.text).length > MAX_OCR_TEXT_BYTES)
                            throw new Error('Invalid text frame');
                        if (this.child === child && !cancel.is_cancelled()) this.onText(frame.text);
                        continue;
                    }
                    if (![undefined, 'copy-image', 'pin'].includes(frame.action) ||
                        typeof frame.png !== 'string' || frame.png.length > frameLimit)
                        throw new Error('Invalid editor frame');
                    const edited = GLib.base64_decode(frame.png);
                    imageInfo(edited, 'image/png');
                    if (this.child === child && !cancel.is_cancelled())
                        (frame.action === 'pin' ? this.onPin : this.onCopy)(edited);
                }
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
        if (!child) return;
        // Let GTK cancel its OCR subprocess before exit. Fall back to a kill
        // if a damaged or unresponsive helper cannot handle SIGTERM.
        child.send_signal(15);
        let timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            timer = 0; child.force_exit(); return GLib.SOURCE_REMOVE;
        });
        child.wait_async(null, (process, result) => {
            try { process.wait_finish(result); } catch { /* Already exiting. */ }
            if (timer) { GLib.source_remove(timer); timer = 0; }
        });
    }
}
