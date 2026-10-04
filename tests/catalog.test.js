// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {CatalogIndex, kaomoji, symbols} from '../extension/core/catalog.js';
import {gifPaths, validateGif, MAX_GIF_BYTES, MAX_GIF_FILES} from '../extension/core/gif.js';
import {clampPanelPosition, placeNearPointer, pointInRect, rememberWindowClick, resolveWindowClick} from '../extension/core/placement.js';

const gif = () => new Uint8Array(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'));

test('catalog search matches descriptive names and groups while returning insertable text', () => {
    const index = new CatalogIndex(symbols);
    assert.ok(index.search('plus minus').some(x => x.text === '±'));
    assert.ok(index.search('beta', 'Greek').some(x => x.text === 'β'));
    assert.equal(index.search('beta', 'Arrows').length, 0);
    assert.ok(index.search('Ω').some(x => x.text === 'Ω'));
    assert.ok(new CatalogIndex(kaomoji).search('happy').length > 3);
    assert.ok(symbols.every(x => x.text.length && x.name.length));
});

test('GIF checks accept valid small data and reject wrong format, truncation, size and dimensions', () => {
    assert.deepEqual(validateGif(gif()), {width: 1, height: 1});
    assert.throws(() => validateGif(new TextEncoder().encode('this is not a GIF')));
    assert.throws(() => validateGif(gif().slice(0, -1)));
    assert.throws(() => validateGif(new Uint8Array(MAX_GIF_BYTES + 1)));
    const oversized = gif();
    oversized[6] = 1;
    oversized[7] = 8;
    assert.throws(() => validateGif(oversized));
});

test('GIF favorites accept unique local paths and respect the cap', () => {
    assert.deepEqual(gifPaths(['/a.gif', '/a.gif', '/B.GIF', 'https://x/a.gif', 'relative.gif',
        '/bad\0.gif', '/x.png', null]), ['/a.gif', '/B.GIF']);
    assert.equal(gifPaths(Array.from({length: 60}, (_, i) => `/tmp/${i}.gif`)).length, MAX_GIF_FILES);
});

test('popup placement stays within work areas on negative and scaled monitor coordinates', () => {
    const area = {x: -1920, y: 24, width: 1920, height: 1056};
    const position = placeNearPointer([-1900, 40], area, [390, 600]);
    assert.deepEqual(position, {x: -1888, y: 52});
    const edge = placeNearPointer([-2, 1079], area, [780, 900], 24);
    assert.deepEqual(edge, {x: -804, y: 155});
    assert.equal(pointInRect([-803, 156], [edge.x, edge.y], [780, 900]), true);
    assert.equal(pointInRect([-24, 1055], [edge.x, edge.y], [780, 900]), false);
});

test('window click anchors follow a moved window and fall back after resizing or switching apps', () => {
    const window = {}, frame = {x: 200, y: 100, width: 800, height: 600};
    const point = [450, 630], pointer = [20, 30, 0];
    const click = rememberWindowClick(window, frame, point);
    assert.deepEqual(resolveWindowClick(click, window, frame, pointer), point);
    assert.deepEqual(resolveWindowClick(click, window, {...frame, x: -900, y: 40}, pointer), [-650, 570]);
    assert.deepEqual(resolveWindowClick(click, window, {...frame, width: 900}, pointer), [20, 30]);
    assert.deepEqual(resolveWindowClick(click, {}, frame, pointer), [20, 30]);
    assert.deepEqual(resolveWindowClick(null, window, frame, pointer), [20, 30]);
    assert.equal(rememberWindowClick(window, frame, [0, 0]), null);
    assert.equal(rememberWindowClick(window, frame, [NaN, 200]), null);
    assert.equal(rememberWindowClick(null, frame, point), null);
});

test('manual popup positions clamp inside a negative-origin monitor work area', () => {
    const area = {x: -1920, y: 32, width: 1920, height: 1048};
    assert.deepEqual(clampPanelPosition([-3000, -100], area, [426, 664]), {x: -1908, y: 44});
    assert.deepEqual(clampPanelPosition([100, 3000], area, [426, 664]), {x: -438, y: 404});
});
