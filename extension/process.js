// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// Owned, pipe-sized writes prevent a blocking Unix pipe or a collected GI
// array argument from freezing the UI or corrupting transferred bytes.
export async function writePipe(stream, data, cancel) {
    let offset = 0;
    while (offset < data.length) {
        const chunk = new GLib.Bytes(data.slice(offset, offset + 4096));
        const written = await new Promise((resolve, reject) => stream.write_bytes_async(chunk,
            GLib.PRIORITY_DEFAULT, cancel, (s, r) => {
                try { resolve(s.write_bytes_finish(r)); } catch { reject(new Error('Pipe write failed')); }
            }));
        if (!written) throw new Error('Pipe closed');
        offset += written;
    }
}

export async function runProcess(argv, input, {cancel = null, timeoutMs = 30000, outputLimit = 65536} = {}) {
    if (cancel?.is_cancelled()) throw new Error('Process cancelled');
    const child = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.STDOUT_PIPE |
        Gio.SubprocessFlags.STDERR_SILENCE | (input ? Gio.SubprocessFlags.STDIN_PIPE : 0)}).spawnv(argv);
    const local = new Gio.Cancellable();
    let waited = false;
    const stop = () => { local.cancel(); if (!waited) child.force_exit(); };
    const signal = cancel?.connect(stop);
    let timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeoutMs, () => { timeout = 0; stop(); return GLib.SOURCE_REMOVE; });
    const waiting = new Promise((resolve, reject) => child.wait_async(null, (s, r) => {
        try { s.wait_finish(r); waited = true; resolve(); } catch { reject(new Error('Process wait failed')); }
    }));
    const writing = (async () => {
        if (!input) return;
        const stream = child.get_stdin_pipe();
        await writePipe(stream, input, local);
        stream.close(null);
    })();
    const reading = (async () => {
        const chunks = [];
        let size = 0;
        const stream = child.get_stdout_pipe();
        while (true) {
            const chunk = await new Promise((resolve, reject) => stream.read_bytes_async(4096,
                GLib.PRIORITY_DEFAULT, local, (s, r) => {
                    try { resolve(s.read_bytes_finish(r).get_data().slice()); }
                    catch { reject(new Error('Process read failed')); }
                }));
            if (!chunk.length) break;
            size += chunk.length;
            if (size > outputLimit) throw new Error('Process output limit reached');
            chunks.push(chunk);
        }
        const result = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        return result;
    })();
    try {
        const [, result] = await Promise.all([writing, reading, waiting]);
        if (local.is_cancelled() || !child.get_successful()) throw new Error('Process failed');
        return result;
    } finally {
        stop();
        if (signal) cancel.disconnect(signal);
        if (timeout) GLib.source_remove(timeout);
    }
}
