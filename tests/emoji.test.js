// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EmojiIndex} from '../extension/core/emoji.js';
const data = JSON.parse(readFileSync('extension/data/emoji.json', 'utf8'));
const emoji = new EmojiIndex(data.emoji);

test('complete unique Emoji 17 fully-qualified dataset and categories', () => {
    assert.equal(data.unicodeVersion, '17.0');
    assert.ok(data.emoji.length >= 3900);
    assert.equal(new Set(data.emoji.map(x => x.text)).size, data.emoji.length);
    assert.ok(emoji.groups.includes('Smileys & Emotion'));
    assert.ok(emoji.groups.includes('Flags'));
    for (const record of data.emoji) {
        assert.ok(record.text && record.name && record.group && record.subgroup);
        assert.ok(Array.isArray(record.keywords) && Array.isArray(record.tones));
    }
});
for (const [query, text] of [['grinning face', '😀'], ['DNA', '🧬'],
    ['scientist', '👩‍🔬'], ['smile', '😀'], ['thumbs up', '👍']]) {
    test(`emoji name/CLDR keyword search ${query}`, () => {
        assert.ok(emoji.search(query).some(x => x.text === text));
    });
}
test('literal emoji and category search', () => {
    assert.ok(emoji.search('😀').some(x => x.text === '😀'));
    assert.ok(emoji.search('', 'Flags').every(x => x.group === 'Flags'));
    assert.equal(emoji.search('no-such-emoji').length, 0);
});
test('skin-tone variants include ZWJ and mixed-tone sequences', () => {
    assert.ok(emoji.search('thumbs up', 'All', 'dark').some(x => x.text === '👍🏿'));
    assert.ok(!emoji.search('thumbs up', 'All', 'dark').some(x => x.text === '👍🏻'));
    assert.ok(emoji.search('scientist', 'All', 'medium').some(x => x.text === '👩🏽‍🔬'));
    assert.ok(emoji.search('', 'All', 'default').every(x => x.tones.length === 0));
    assert.ok(data.emoji.some(x => new Set(x.tones).size > 1));
});
test('recents deduplicate, reorder, survive reload and ignore unknown values', () => {
    const e = new EmojiIndex(data.emoji, ['invalid', '😀', '😀']);
    assert.deepEqual(e.recent, ['😀']);
    e.use('🧬');
    e.use('😀');
    assert.deepEqual(e.search('', 'Recent').map(x => x.text), ['😀', '🧬']);
    assert.equal(e.use('invalid'), false);
    const reloaded = new EmojiIndex(data.emoji, e.recent);
    assert.deepEqual(reloaded.recent, e.recent);
});
test('recents bounded to 30', () => {
    const e = new EmojiIndex(data.emoji);
    data.emoji.slice(0, 40).forEach(x => e.use(x.text));
    assert.equal(e.recent.length, 30);
});
for (const [name, hash] of Object.entries(data.inputHashes)) {
    test(`Unicode input hash ${name}`, () => assert.equal(createHash('sha256')
        .update(readFileSync(`vendor/unicode/${name}`)).digest('hex'), hash));
}
