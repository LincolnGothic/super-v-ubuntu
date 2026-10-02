// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {History, byteLength, validText} from '../extension/core/history.js';
import {MAX_PINNED, MAX_TEXT_BYTES, MAX_TOTAL_BYTES} from '../extension/core/settings.js';

test('newest insertion order and original text preserved', () => {
    const h = new History();
    ['A', 'B', 'C'].forEach(x => h.add(x));
    assert.deepEqual(h.entries.map(x => x.text), ['C', 'B', 'A']);
});
test('deduplicate exactly, bump recency, preserve ID and pin', () => {
    const h = new History();
    const a = h.add('A');
    h.togglePin(a.id);
    h.add('B');
    assert.equal(h.add('A').id, a.id);
    assert.deepEqual(h.entries.map(x => x.text), ['A', 'B']);
    assert.equal(h.entries[0].pinned, true);
});
test('limit removes oldest ordinary entries', () => {
    const h = new History(2);
    ['A', 'B', 'C'].forEach(x => h.add(x));
    assert.deepEqual(h.entries.map(x => x.text), ['C', 'B']);
});
test('pins survive trimming and clear; all-clear removes them', () => {
    const h = new History(1);
    const a = h.add('A');
    h.togglePin(a.id);
    ['B', 'C', 'D'].forEach(x => h.add(x));
    assert.deepEqual(h.entries.map(x => x.text), ['D', 'A']);
    h.clear();
    assert.deepEqual(h.entries.map(x => x.text), ['A']);
    h.clear(true);
    assert.equal(h.entries.length, 0);
});
test('unpin and lower limit trim immediately', () => {
    const h = new History(5);
    const a = h.add('A');
    h.togglePin(a.id);
    ['B', 'C', 'D'].forEach(x => h.add(x));
    h.setLimit(1);
    h.togglePin(a.id);
    assert.deepEqual(h.entries.map(x => x.text), ['D']);
});
test('individual deletion and missing ID are safe', () => {
    const h = new History();
    const a = h.add('A');
    assert.equal(h.delete(a.id), true);
    assert.equal(h.delete(a.id), false);
    assert.equal(h.togglePin('missing'), false);
});
for (const text of ['你好 🧬 café', 'first\nsecond\r\nthird\tlast', '👩🏽‍🔬', '  keep whitespace  ', 'e\u0301']) {
    test(`Unicode/multiline round trip ${JSON.stringify(text)}`, () => {
        const h = new History();
        h.add(text);
        const result = History.deserialize(h.toJSON());
        assert.equal(result.recovered, false);
        assert.equal(result.history.entries[0].text, text);
    });
}
test('search is case-insensitive NFKC and matches all query terms', () => {
    const h = new History();
    h.add('Ｆｕｌｌ Width\nHELLO café');
    h.add('different');
    assert.equal(h.search('full hello').length, 1);
    assert.equal(h.search('cafe\u0301').length, 1);
    assert.equal(h.search('hello missing').length, 0);
    assert.equal(h.search('').length, 2);
});
test('Unicode canonical variants are distinct clipboard values', () => {
    const h = new History();
    h.add('é');
    h.add('e\u0301');
    assert.equal(h.entries.length, 2);
});
test('serialization retains pins, order, timestamps and recents', () => {
    const h = new History();
    const a = h.add('A');
    h.togglePin(a.id);
    h.add('B');
    const loaded = History.deserialize(h.toJSON(['😀']));
    assert.deepEqual(loaded.history.entries, h.entries);
    assert.deepEqual(loaded.recent, ['😀']);
});
for (const raw of ['', '{', 'null', '[]', '{"version":2,"entries":[]}',
    '{"version":1,"entries":[{}]}', '{"version":1,"entries":"oops"}']) {
    test(`corruption recovery ${raw}`, () => {
        const result = History.deserialize(raw);
        assert.equal(result.recovered, true);
        assert.deepEqual(result.history.entries, []);
    });
}
test('duplicated/invalid records reject whole file', () => {
    const h = new History();
    h.add('A');
    const data = JSON.parse(h.toJSON());
    data.entries.push(data.entries[0]);
    assert.equal(History.deserialize(JSON.stringify(data)).recovered, true);
    for (const patch of [{id: '../escape'}, {pinned: 'yes'}, {createdAt: -1}, {text: '\0secret'}]) {
        assert.equal(History.deserialize(JSON.stringify({version: 1,
            entries: [{...h.entries[0], ...patch}]})).recovered, true);
    }
});
test('new IDs after load cannot collide with existing records', () => {
    const h = new History(100, () => 123);
    h.add('A');
    const loaded = History.deserialize(h.toJSON()).history;
    loaded.clock = () => 123;
    loaded.add('B');
    assert.equal(new Set(loaded.entries.map(x => x.id)).size, 2);
});
for (const value of [null, undefined, 8, '', '\0', 'x'.repeat(MAX_TEXT_BYTES + 1)]) {
    test(`reject invalid text (${typeof value})`, () => {
        assert.equal(validText(value), false);
        assert.equal(new History().add(value), null);
    });
}
test('entry size counts UTF-8 bytes', () => {
    assert.equal(byteLength('😀'), 4);
    assert.equal(validText('😀'.repeat(MAX_TEXT_BYTES / 4)), true);
    assert.equal(validText('😀'.repeat(MAX_TEXT_BYTES / 4 + 1)), false);
});
test('pins have a hard bound', () => {
    const h = new History(500);
    for (let i = 0; i < MAX_PINNED; i++)
        assert.equal(h.togglePin(h.add(String(i)).id), true);
    assert.equal(h.togglePin(h.add('overflow').id), false);
});
test('total byte budget evicts ordinary entries before pinned entries', () => {
    const h = new History(500);
    const pin = h.add('important');
    h.togglePin(pin.id);
    for (let i = 0; i < 200; i++)
        h.add(`${i}:` + 'x'.repeat(MAX_TEXT_BYTES - 5));
    assert.ok(h.entries.some(x => x.id === pin.id));
    assert.ok(h.entries.reduce((n, x) => n + byteLength(x.text), 0) <= MAX_TOTAL_BYTES);
    assert.ok(h.entries.length < 200);
});
