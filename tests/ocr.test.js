// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadModule} from './helpers/load-module.js';
const png = new Uint8Array(Buffer.from(JSON.parse(readFileSync('tests/fixtures/images.json')).png, 'base64'));
async function fixture(outputs, times = [0, 0, 10000000]) {
    const calls = [];
    const {OcrEngine} = await loadModule('extension/ocr.js', {
        'gi://GLib': {default: {find_program_in_path: () => '/usr/bin/tesseract', get_monotonic_time: () => times.shift()}},
        './process.js': {runProcess: async (argv, input, options) => {
            calls.push({argv, input, options}); return new TextEncoder().encode(outputs.shift());
        }},
    });
    return {engine: new OcrEngine(), calls};
}
test('empty automatic OCR retries a text block within the same deadline', async () => {
    const f = await fixture(['', '한국어']);
    const cancel = {};
    assert.equal(await f.engine.recognize(png, 'kor', ['kor', 'eng'], cancel), '한국어');
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[0].options.timeoutMs, 30000);
    assert.equal(f.calls[1].options.timeoutMs, 20000);
    assert.equal(f.calls[1].options.cancel, cancel);
    assert.ok(f.calls.every(call => call.argv.includes('kor+eng') && call.input === png));
});
test('recognition with text does not retry or launch an expired fallback', async () => {
    const f = await fixture(['Hello']);
    assert.equal(await f.engine.recognize(png, 'eng', ['eng'], null), 'Hello');
    assert.equal(f.calls.length, 1);
    const expired = await fixture([''], [0, 0, 30001000]);
    await assert.rejects(expired.engine.recognize(png, 'eng', ['eng'], null));
    assert.equal(expired.calls.length, 1);
});
test('only installed language IDs reach the OCR executable', async () => {
    const f = await fixture(['List of available languages (4):\neng\nosd\nchi_sim\n../../evil\n']);
    assert.deepEqual(Array.from(await f.engine.languages(null)), ['eng', 'chi_sim']);
    await assert.rejects(f.engine.recognize(png, '-l evil', ['-l evil'], null));
    assert.equal(f.calls.length, 1);
});
