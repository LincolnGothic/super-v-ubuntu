// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadModule} from './helpers/load-module.js';
const bytes = new Uint8Array(Buffer.from(JSON.parse(readFileSync('tests/fixtures/images.json')).png, 'base64'));
async function fixture() {
    const writes = [], reads = [], copies = [];
    let errors = 0, exited = 0, wait;
    const input = {write_bytes_async(chunk, priority, cancel, callback) { writes.push(chunk.bytes); queueMicrotask(() => callback(this, {length: chunk.bytes.length})); },
        write_bytes_finish: result => result.length, close_async(priority, cancel, callback) { callback(this, {}); }, close_finish() {}};
    const output = {read_bytes_async(size, priority, cancel, callback) { reads.push(callback); },
        read_bytes_finish: value => ({get_data: () => value})};
    const child = {get_stdin_pipe: () => input, get_stdout_pipe: () => output,
        wait_async(cancel, callback) { wait = callback; }, wait_finish() {}, get_successful: () => true,
        force_exit() { exited++; }};
    const gio = {SubprocessFlags: {STDIN_PIPE: 1, STDOUT_PIPE: 2, STDERR_SILENCE: 4},
        SubprocessLauncher: class {spawnv() { return child; }},
        Cancellable: class {cancel() { this.cancelled = true; } is_cancelled() { return this.cancelled; }}};
    const glib = {Bytes: class {constructor(value) { this.bytes = value; }}, PRIORITY_DEFAULT: 0, base64_decode: text => new Uint8Array(Buffer.from(text, 'base64'))};
    const {EditorBridge} = await loadModule('extension/editor-bridge.js', {
        'gi://Gio': {default: gio}, 'gi://GLib': {default: glib}});
    const bridge = new EditorBridge({get_child: () => ({get_path: () => '/editor.js'})}, value => copies.push(value), () => errors++);
    bridge.open(bytes, 'image/png');
    return {bridge, writes, copies, input, read(value) { reads.shift()(output, value); },
        wait: () => wait(child, {}), errors: () => errors, exited: () => exited};
}
test('natural editor exit drains Copy frames before releasing the process', async () => {
    const f = await fixture();
    f.wait();
    assert.ok(f.bridge.child);
    const frame = new TextEncoder().encode(JSON.stringify({png: Buffer.from(bytes).toString('base64')}) + '\n');
    f.read(frame.subarray(0, 13)); f.read(frame.subarray(13));
    assert.deepEqual(f.copies, [bytes]);
    f.read(new Uint8Array());
    assert.equal(f.bridge.child, null); assert.equal(f.errors(), 0);
});
test('malformed editor output is rejected without touching the clipboard', async () => {
    const f = await fixture();
    f.read(new TextEncoder().encode('{"png":"invalid"}\n'));
    assert.deepEqual(f.copies, []); assert.equal(f.errors(), 1); assert.equal(f.exited(), 1);
});
test('explicit close rejects late Copy output and does not report a teardown error', async () => {
    const f = await fixture(); f.bridge.close();
    f.read(new TextEncoder().encode(JSON.stringify({png: Buffer.from(bytes).toString('base64')}) + '\n'));
    f.wait(); assert.deepEqual(f.copies, []); assert.equal(f.errors(), 0);
    assert.ok(f.writes.every(chunk => chunk.length <= 4096));
});
