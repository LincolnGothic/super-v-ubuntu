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

test('numbered markers advance without changing existing marks and survive undo', () => {
    const doc = new EditorDocument(200, 100);
    const first = doc.add({...mark, type: 'number'});
    const second = doc.add({...mark, type: 'number', x: 50});
    assert.deepEqual(doc.state.annotations.map(a => a.number), [1, 2]);
    doc.delete(first); doc.undo();
    assert.deepEqual(doc.state.annotations.map(a => a.number), [1, 2]);
    doc.update(second, {color: '#ffffff'});
    assert.equal(doc.state.annotations[1].number, 2);
});
test('moving and resizing one mark preserves later annotations and undo snapshots', () => {
    const doc = new EditorDocument(100, 100);
    const first = doc.add({...mark, type: 'rectangle'});
    const second = doc.add({...mark, type: 'arrow', x: 40, x2: 70});
    const previous = JSON.stringify(doc.state);
    doc.update(first, doc.transformed(first, 1000, 1000));
    const moved = doc.state.annotations[0];
    assert.equal(moved.x2, 100); assert.equal(moved.y2, 100);
    assert.equal(doc.state.annotations[1].id, second);
    assert.equal(doc.state.annotations[1].x, 40);
    doc.undo(); assert.equal(JSON.stringify(doc.state), previous);
    doc.update(first, doc.transformed(first, 10, 10, true));
    assert.equal(doc.state.annotations[0].x2, 40);
    doc.delete(first); assert.equal(doc.state.annotations[0].id, second);
    doc.undo(); assert.equal(doc.state.annotations.length, 2);
});
test('selection chooses the topmost mark and respects crop clipping', () => {
    const doc = new EditorDocument(100, 100);
    const first = doc.add({...mark, type: 'rectangle'});
    const second = doc.add({...mark, type: 'highlight'});
    assert.equal(doc.hit(10, 10), second);
    doc.delete(second); assert.equal(doc.hit(10, 10), first);
    doc.crop([20, 20], [80, 80]); assert.equal(doc.hit(10, 10), null);
    assert.throws(() => doc.transformed(first, Infinity, 0));
});

test('light mosaic brush validates independent tile size and large stroke thickness', () => {
    const doc = new EditorDocument(400, 200);
    const id = doc.add({...mark, type: 'mosaic', width: 200, block: 24, points: [[40, 40], [50, 80]]});
    assert.equal(doc.state.annotations[0].width, 200);
    assert.equal(doc.state.annotations[0].block, 24);
    doc.update(id, {width: 64, block: 4});
    assert.equal(doc.state.annotations[0].block, 4);
    for (const patch of [{width: 257}, {block: 0}, {block: 65}, {block: 4.5}])
        assert.throws(() => doc.add({...mark, type: 'mosaic', ...patch}));
    doc.undo(); assert.equal(doc.state.annotations[0].width, 200);
});
test('black and white filter is undoable without modifying annotations or source coordinates', () => {
    const doc = new EditorDocument(100, 100);
    doc.add(mark); doc.toggleGrayscale();
    assert.equal(doc.state.grayscale, true);
    assert.equal(doc.state.annotations[0].x, mark.x);
    doc.undo(); assert.equal(doc.state.grayscale, false);
    doc.redo(); assert.equal(doc.state.grayscale, true);
});
