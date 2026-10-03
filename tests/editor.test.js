// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorDocument, imageTransform, imagePoint} from '../extension/core/editor.js';

const mark = {type: 'redact', x: 5, y: 6, x2: 30, y2: 40, color: '#ff0000', width: 4};
test('crop clamps reversed drags, preserves original coordinates and is undoable', () => {
    const doc = new EditorDocument(64, 48);
    doc.add(mark);
    doc.crop([80, 90], [10, 8]);
    assert.deepEqual(doc.state.crop, {x: 10, y: 8, width: 54, height: 40});
    assert.equal(doc.state.annotations[0].x, 5);
    doc.undo();
    assert.equal(doc.state.crop.width, 64);
    doc.redo();
    assert.equal(doc.state.crop.width, 54);
    doc.crop([12, 10], [20, 30]);
    assert.deepEqual(doc.state.crop, {x: 12, y: 10, width: 8, height: 20});
});
test('annotation coordinates and colors are validated before rendering', () => {
    const doc = new EditorDocument(64, 48);
    doc.add({...mark, x: -10, x2: 100});
    assert.equal(doc.state.annotations[0].x, 0);
    assert.equal(doc.state.annotations[0].x2, 64);
    for (const invalid of [{x: NaN}, {type: 'exec'}, {color: 'red'}, {width: 100}, {points: [[Infinity, 0]]}])
        assert.throws(() => doc.add({...mark, ...invalid}));
    assert.throws(() => new EditorDocument(8192, 8192));
    assert.throws(() => new EditorDocument(0, 1));
});
test('a new edit discards redo and empty crops do not enter undo history', () => {
    const doc = new EditorDocument(64, 48);
    assert.equal(doc.crop([0, 0], [0, 0]), false);
    assert.equal(doc.past.length, 0);
    doc.add(mark);
    doc.undo();
    doc.add({...mark, type: 'arrow'});
    assert.equal(doc.redo(), false);
    assert.equal(doc.state.annotations[0].type, 'arrow');
});
test('annotations, stroke points, text and undo snapshots have independent bounds', () => {
    const doc = new EditorDocument(64, 48);
    for (let i = 0; i < 128; i++)
        doc.add({...mark, text: 'a'.repeat(700)});
    assert.equal(doc.past.length, 32);
    assert.equal(doc.state.annotations[0].text.length, 500);
    assert.throws(() => doc.add(mark));
    const pen = new EditorDocument(64, 48);
    pen.add({...mark, type: 'pen', points: Array.from({length: 4096}, () => [1, 1])});
    assert.throws(() => pen.add({...mark, points: [[1, 1]]}));
});
test('zoom and pan map viewport gestures to the original cropped image', () => {
    const crop = {x: 10, y: 20, width: 100, height: 50};
    const transform = imageTransform(crop, 500, 300, 2, [30, -10]);
    assert.equal(transform.scale, 10);
    assert.deepEqual(imagePoint(crop, transform, transform.x + 250, transform.y + 300), [35, 50]);
});
