// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFilename, validateExportPattern, ocrLanguageArgs} from '../extension/core/export.js';
import {PinBudget, pinGeometry} from '../extension/core/pins.js';
import {readFileSync} from 'node:fs';
const png = new Uint8Array(Buffer.from(JSON.parse(readFileSync('tests/fixtures/images.json')).png, 'base64'));
test('export names substitute only known tokens and remain a single PNG basename', () => {
    assert.equal(exportFilename('{date}-{time}-{width}x{height}.png', {date: '2026-10-03', time: '10-00-00', width: 64, height: 48}),
        '2026-10-03-10-00-00-64x48.png');
    for (const value of ['', '../data', '/etc/file', 'x\\file', '\0', 'a'.repeat(121), '图'.repeat(90), '{unknown}', '{date'])
        assert.throws(() => validateExportPattern(value));
    assert.equal(validateExportPattern('截图 {width}'), '截图 {width}');
});
test('OCR language selection only passes installed IDs and adds English for mixed text', () => {
    assert.equal(ocrLanguageArgs('chi_sim', ['eng', 'chi_sim']), 'chi_sim+eng');
    assert.equal(ocrLanguageArgs('jpn', ['jpn']), 'jpn');
    assert.throws(() => ocrLanguageArgs('kor', ['eng']));
    assert.throws(() => ocrLanguageArgs('eng;rm', ['eng;rm']));
});
test('screen pins have a count bound and released capacity can be reused', () => {
    const budget = new PinBudget();
    const ids = Array.from({length: 5}, () => budget.add(png, 'image/png'));
    assert.throws(() => budget.add(png, 'image/png'));
    budget.delete(ids[0]); budget.add(png, 'image/png');
    budget.clear(); assert.equal(budget.items.size, 0);
    assert.throws(() => budget.add(new Uint8Array(8), 'image/png'));
});
test('pin zoom and drag stay inside work areas with negative monitor origins', () => {
    const area = {x: -1600, y: 32, width: 1600, height: 868};
    const geometry = pinGeometry(8192, 2048, 4, area, -9999, 9999);
    assert.ok(geometry.x >= area.x && geometry.y >= area.y);
    assert.ok(geometry.x + geometry.width <= area.x + area.width);
    assert.ok(geometry.y + geometry.height <= area.y + area.height);
    assert.ok(Math.abs(geometry.imageWidth / geometry.imageHeight - 4) < 0.02);
});
