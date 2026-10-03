// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageInfo, imageFilename, validImageRecord, MAX_IMAGE_BYTES,
    MAX_IMAGE_TOTAL_BYTES} from '../extension/core/image.js';
import {History} from '../extension/core/history.js';

const fixtures = JSON.parse(readFileSync('tests/fixtures/images.json', 'utf8'));
const png = new Uint8Array(Buffer.from(fixtures.png, 'base64'));
const jpeg = new Uint8Array(Buffer.from(fixtures.jpeg, 'base64'));
const record = (number = 1, bytes = png.length) => ({kind: 'image', mime: 'image/png',
    digest: number.toString(16).padStart(64, '0'), bytes, width: 64, height: 48});

test('PNG/JPEG dimensions are inspected without decoding pixel data', () => {
    assert.deepEqual(imageInfo(png, 'image/png'), {width: 64, height: 48});
    assert.deepEqual(imageInfo(jpeg, 'image/jpeg'), {width: 64, height: 48});
});
test('wrong MIME, incomplete images and oversized input are rejected', () => {
    for (const [bytes, mime] of [[png, 'image/jpeg'], [jpeg, 'image/png'], [png, 'image/gif'],
        [png.slice(0, -1), 'image/png'], [jpeg.slice(0, -1), 'image/jpeg'],
        [new Uint8Array(MAX_IMAGE_BYTES + 1), 'image/png']])
        assert.throws(() => imageInfo(bytes, mime));
});
test('dimensions and pixel counts are bounded before native decoding', () => {
    for (const [width, height] of [[0, 1], [8193, 1], [8192, 8192]]) {
        const bytes = png.slice();
        const view = new DataView(bytes.buffer);
        view.setUint32(16, width);
        view.setUint32(20, height);
        assert.throws(() => imageInfo(bytes, 'image/png'));
    }
    const chunk = png.slice();
    new DataView(chunk.buffer).setUint32(33, 0xffffffff);
    assert.throws(() => imageInfo(chunk, 'image/png'));
});
test('image files use only a checked digest and format; stored paths are never trusted', () => {
    assert.equal(imageFilename(record()), `${'0'.repeat(63)}1.png`);
    for (const patch of [{digest: '../escape'}, {mime: 'image/svg+xml'}, {bytes: MAX_IMAGE_BYTES + 1},
        {width: 0}, {width: 8192, height: 8192}]) {
        assert.equal(validImageRecord({...record(), ...patch}), false);
        assert.throws(() => imageFilename({...record(), ...patch}));
    }
});
test('mixed history deduplicates images, preserves pins and round trips metadata', () => {
    const history = new History();
    const image = history.addImage(record());
    history.togglePin(image.id);
    history.add(image.digest); // A text value equal to a digest is still distinct.
    assert.equal(history.addImage(record()).id, image.id);
    assert.equal(history.entries.length, 2);
    assert.equal(image.pinned, true);
    const restored = History.deserialize(history.toJSON(['😀']));
    assert.equal(restored.recovered, false);
    assert.deepEqual(restored.history.entries, history.entries);
    assert.deepEqual(restored.recent, ['😀']);
});
test('v1 text history migrates without changing IDs, pins, order or recents', () => {
    const entry = {id: 'old-1', text: 'previous version', pinned: true, createdAt: 1};
    const result = History.deserialize(JSON.stringify({version: 1, entries: [entry], recent: ['😀']}));
    assert.equal(result.recovered, false);
    assert.deepEqual(result.history.entries, [entry]);
    assert.equal(JSON.parse(result.history.toJSON()).version, 2);
});
test('image budget evicts old unpinned images while keeping text and pins', () => {
    const history = new History(100);
    const pinned = history.addImage(record(1, MAX_IMAGE_BYTES));
    history.togglePin(pinned.id);
    history.add('text');
    for (let index = 2; index <= 7; index++)
        history.addImage(record(index, MAX_IMAGE_BYTES));
    assert.equal(history.entries.filter(entry => entry.kind === 'image').length, 4);
    assert.equal(history.entries.filter(entry => entry.kind === 'image')
        .reduce((sum, entry) => sum + entry.bytes, 0), MAX_IMAGE_TOTAL_BYTES);
    assert.ok(history.entries.includes(pinned));
    assert.ok(history.entries.some(entry => entry.text === 'text'));
    history.clear();
    assert.deepEqual(history.entries, [pinned]);
    history.clear(true);
    assert.equal(history.entries.length, 0);
});
test('a full pinned image budget rejects new images without removing pins', () => {
    const history = new History();
    for (let index = 1; index <= 4; index++)
        history.togglePin(history.addImage(record(index, MAX_IMAGE_BYTES)).id);
    assert.equal(history.addImage(record(5)), null);
    assert.equal(history.entries.length, 4);
});
test('shared entry limit and localized image search apply to mixed history', () => {
    const history = new History(2);
    history.add('old');
    history.addImage(record());
    history.add('new');
    assert.equal(history.entries.length, 2);
    assert.equal(history.search('图片 64', '图片').length, 1);
    assert.equal(history.search('png 48').length, 1);
    assert.equal(history.search('new').length, 1);
});
test('invalid image metadata, unknown kinds and duplicate digests recover safely', () => {
    const history = new History();
    history.addImage(record());
    const data = JSON.parse(history.toJSON());
    for (const patch of [{digest: '../image'}, {bytes: -1}, {kind: 'file'}, {mime: 'text/plain'}]) {
        const damaged = {version: 2, entries: [{...data.entries[0], ...patch}]};
        assert.equal(History.deserialize(JSON.stringify(damaged)).recovered, true);
    }
    data.entries.push({...data.entries[0], id: 'other-id'});
    assert.equal(History.deserialize(JSON.stringify(data)).recovered, true);
});
