// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EmojiIndex} from '../extension/core/emoji.js';
import {emojiLocale, format} from '../extension/core/localization.js';
import {CatalogIndex, symbols} from '../extension/core/catalog.js';

const records = JSON.parse(readFileSync('extension/data/emoji.json', 'utf8')).emoji;
const load = locale => JSON.parse(readFileSync(`extension/data/emoji-locales/${locale}.json`, 'utf8'));

test('system locale selects regional and script-specific Chinese before language fallbacks', () => {
    for (const language of ['zh_TW.UTF-8', 'zh_HK', 'zh-MO', 'zh_Hant', 'zh-Hant-CN'])
        assert.equal(emojiLocale([language, 'zh', 'en']), 'zh_Hant');
    for (const language of ['zh_CN.UTF-8', 'zh_SG', 'zh', 'zh_Hans', 'zh-Hans-TW'])
        assert.equal(emojiLocale([language, 'en']), 'zh');
    for (const [language, expected] of [['ja_JP', 'ja'], ['es_MX', 'es'], ['fr_CA', 'fr'], ['ko_KR', 'ko']])
        assert.equal(emojiLocale([language, 'en']), expected);
    assert.equal(emojiLocale(['de_DE', 'ja_JP', 'en_US']), 'ja');
    assert.equal(emojiLocale(['en_US', 'fr_FR']), 'en');
    assert.equal(emojiLocale(['C.UTF-8', 'es']), 'en');
    assert.equal(emojiLocale(['de_DE']), 'en');
});

for (const [locale, query] of [['zh', '笑脸'], ['zh_Hant', '笑臉'], ['ja', '笑顔'],
    ['es', 'sonrisa'], ['fr', 'sourire'], ['ko', '웃는']]) {
    test(`${locale}: localized names, keyword search and English aliases retain glyph identity`, () => {
        const data = load(locale);
        assert.equal(data.cldrVersion, '48');
        assert.ok(Object.keys(data.annotations).length > 3800);
        const index = new EmojiIndex(records, ['😀'], data.annotations);
        assert.notEqual(index.byText.get('😀').name, records[0].name);
        assert.ok(index.search(query).length > 0);
        assert.ok(index.search('grinning face').some(x => x.text === '😀'));
        assert.ok(index.search('scientist', 'People & Body', 'medium').some(x => x.text === '👩🏽‍🔬'));
        assert.equal(index.search('', 'Recent')[0].text, '😀');
        assert.equal(index.records.length, records.length);
        assert.ok(index.records.every(x => x.group && x.subgroup));
        const fallback = new EmojiIndex(records, [], {});
        assert.equal(fallback.byText.get('😀').name, records[0].name);
    });
}

test('partial emoji annotations fall back per entry without mutating the English database', () => {
    const original = JSON.stringify(records);
    const index = new EmojiIndex(records, [], {'😀': {name: 'test face', keywords: ['local alias']}});
    assert.ok(index.search('local alias').some(x => x.text === '😀'));
    assert.equal(index.byText.get('😁').name, records.find(x => x.text === '😁').name);
    assert.equal(JSON.stringify(records), original);
});

test('localized catalog names search in both languages while category IDs stay stable', () => {
    const labels = {'plus minus': '加减', Math: '数学'};
    const index = new CatalogIndex(symbols, message => labels[message] ?? message);
    assert.ok(index.search('加减', 'Math').some(x => x.text === '±'));
    assert.ok(index.search('plus minus', 'Math').some(x => x.text === '±'));
    assert.ok(index.search('数学', 'Math').some(x => x.text === '±'));
    assert.equal(index.search('加减')[0].name, '加减');
    assert.ok(index.groups.includes('Math'));
});

test('format inserts filenames and paths literally', () => {
    assert.equal(format('Pinned: %s', '$& 100% text'), 'Pinned: $& 100% text');
    assert.equal(format('Show more (%d)', 21), 'Show more (21)');
});
