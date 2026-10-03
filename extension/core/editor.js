// SPDX-License-Identifier: GPL-3.0-or-later
import {MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS} from './image.js';

export const tools = ['move', 'select', 'crop', 'arrow', 'rectangle', 'text', 'highlight', 'pen', 'redact', 'mosaic', 'number'];
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class EditorDocument {
    constructor(width, height) {
        if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= MAX_IMAGE_DIMENSION) ||
            width * height > MAX_IMAGE_PIXELS)
            throw new Error('Invalid image dimensions');
        this.state = {crop: {x: 0, y: 0, width, height}, annotations: [], grayscale: false};
        this.past = [];
        this.future = [];
        this.nextId = 1;
    }

    point(x, y) {
        const c = this.state.crop;
        if (![x, y].every(Number.isFinite))
            throw new Error('Invalid coordinates');
        return [clamp(x, c.x, c.x + c.width), clamp(y, c.y, c.y + c.height)];
    }

    _commit(state) {
        this.past.push(this.state);
        if (this.past.length > 32)
            this.past.shift();
        this.state = state;
        this.future = [];
    }

    crop(start, end) {
        const [x1, y1] = this.point(...start);
        const [x2, y2] = this.point(...end);
        const x = Math.floor(Math.min(x1, x2));
        const y = Math.floor(Math.min(y1, y2));
        const width = Math.ceil(Math.max(x1, x2)) - x;
        const height = Math.ceil(Math.max(y1, y2)) - y;
        if (width < 1 || height < 1)
            return false;
        this._commit({...clone(this.state), crop: {x, y, width, height}});
        return true;
    }

    _annotation(annotation) {
        if (!tools.includes(annotation.type) || ['move', 'select', 'crop'].includes(annotation.type) ||
            !/^#[a-f\d]{6}$/iu.test(annotation.color) || !Number.isFinite(annotation.width) ||
            annotation.width < 1 || annotation.width > (annotation.type === 'mosaic' ? 256 : 72))
            throw new Error('Invalid annotation');
        const [x, y] = this.point(annotation.x, annotation.y);
        const [x2, y2] = this.point(annotation.x2, annotation.y2);
        const text = typeof annotation.text === 'string' ? annotation.text.slice(0, 500) : '';
        const points = (annotation.points ?? []).map(p => this.point(...p));
        if (points.length > 4096)
            throw new Error('Too many annotation points');
        const number = annotation.type === 'number' ? annotation.number : 0;
        if (annotation.type === 'number' && (!Number.isInteger(number) || number < 1 || number > 999))
            throw new Error('Invalid marker number');
        const block = annotation.type === 'mosaic' ? annotation.block ?? 12 : 12;
        if (!Number.isInteger(block) || block < 4 || block > 64)
            throw new Error('Invalid mosaic tile size');
        return {id: annotation.id, type: annotation.type, x, y, x2, y2, color: annotation.color,
            width: annotation.width, text, points, number, block};
    }

    _marks(annotations) {
        if (annotations.length > 128 || annotations.reduce((sum, a) => sum + a.points.length, 0) > 4096)
            throw new Error('Too many annotations');
        const state = clone(this.state);
        state.annotations = annotations;
        this._commit(state);
    }

    add(annotation) {
        const id = this.nextId;
        const number = Math.max(0, ...this.state.annotations.filter(a => a.type === 'number').map(a => a.number)) + 1;
        const value = this._annotation({...annotation, number, id});
        this._marks([...this.state.annotations, value]);
        this.nextId++;
        return id;
    }

    update(id, patch) {
        const previous = this.state.annotations.find(a => a.id === id);
        if (!previous) return false;
        const value = this._annotation({...previous, ...patch, id});
        this._marks(this.state.annotations.map(a => a.id === id ? value : a));
        return true;
    }

    delete(id) {
        const annotations = this.state.annotations.filter(a => a.id !== id);
        if (annotations.length === this.state.annotations.length) return false;
        this._marks(annotations);
        return true;
    }

    toggleGrayscale() {
        this._commit({...clone(this.state), grayscale: !this.state.grayscale});
    }

    hit(x, y, tolerance = 4) {
        const c = this.state.crop;
        if (x < c.x || y < c.y || x > c.x + c.width || y > c.y + c.height) return null;
        return [...this.state.annotations].reverse().find(a => {
            const b = annotationBounds(a);
            return x >= b.x - tolerance && y >= b.y - tolerance &&
                x <= b.x + b.width + tolerance && y <= b.y + b.height + tolerance;
        })?.id ?? null;
    }

    transformed(id, dx, dy, resize = false) {
        if (![dx, dy].every(Number.isFinite)) throw new Error('Invalid transform');
        const a = this.state.annotations.find(mark => mark.id === id);
        if (!a) return null;
        const b = annotationBounds(a), c = this.state.crop;
        if (!resize) {
            // Keep annotation anchor points in the crop, preserving its shape.
            const xs = [a.x, a.x2, ...a.points.map(p => p[0])];
            const ys = [a.y, a.y2, ...a.points.map(p => p[1])];
            dx = clamp(dx, c.x - Math.min(...xs), c.x + c.width - Math.max(...xs));
            dy = clamp(dy, c.y - Math.min(...ys), c.y + c.height - Math.max(...ys));
            return {...a, x: a.x + dx, y: a.y + dy, x2: a.x2 + dx, y2: a.y2 + dy,
                points: a.points.map(p => [p[0] + dx, p[1] + dy])};
        }
        const sx = Math.max(2, b.width + dx) / b.width;
        const sy = Math.max(2, b.height + dy) / b.height;
        const point = (x, y) => this.point(b.x + (x - b.x) * sx, b.y + (y - b.y) * sy);
        const [x, y] = point(a.x, a.y), [x2, y2] = point(a.x2, a.y2);
        return {...a, x, y, x2, y2, points: a.points.map(p => point(...p)),
            width: ['text', 'number'].includes(a.type) ? clamp(a.width * Math.min(sx, sy), 1, 72) : a.width};
    }

    undo() {
        if (!this.past.length)
            return false;
        this.future.push(this.state);
        this.state = this.past.pop();
        return true;
    }

    redo() {
        if (!this.future.length)
            return false;
        this.past.push(this.state);
        this.state = this.future.pop();
        return true;
    }
}

export function annotationBounds(a) {
    if (a.type === 'number') {
        const radius = Math.max(10, a.width * 0.8);
        return {x: a.x - radius, y: a.y - radius, width: radius * 2, height: radius * 2};
    }
    if (a.type === 'text') {
        const lines = a.text.split('\n');
        return {x: a.x, y: a.y, width: Math.max(8, ...lines.map(line =>
            [...line].reduce((sum, ch) => sum + (ch.codePointAt(0) > 255 ? 1 : 0.65), 0) * a.width)),
        height: Math.max(8, lines.length * a.width * 1.5)};
    }
    const xs = [a.x, a.x2, ...a.points.map(p => p[0])], ys = [a.y, a.y2, ...a.points.map(p => p[1])];
    const radius = ['pen', 'mosaic'].includes(a.type) ? a.width / 2 : 0;
    return {x: Math.min(...xs) - radius, y: Math.min(...ys) - radius,
        width: Math.max(2, Math.max(...xs) - Math.min(...xs) + radius * 2),
        height: Math.max(2, Math.max(...ys) - Math.min(...ys) + radius * 2)};
}

export function imageTransform(crop, width, height, zoom = 1, pan = [0, 0]) {
    const scale = Math.min(width / crop.width, height / crop.height) * zoom;
    return {scale, x: (width - crop.width * scale) / 2 + pan[0],
        y: (height - crop.height * scale) / 2 + pan[1]};
}

export function imagePoint(crop, transform, x, y) {
    return [crop.x + (x - transform.x) / transform.scale,
        crop.y + (y - transform.y) / transform.scale];
}
