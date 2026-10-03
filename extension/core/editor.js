// SPDX-License-Identifier: GPL-3.0-or-later
import {MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS} from './image.js';

export const tools = ['move', 'crop', 'arrow', 'rectangle', 'text', 'highlight', 'pen', 'redact'];
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class EditorDocument {
    constructor(width, height) {
        if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= MAX_IMAGE_DIMENSION) ||
            width * height > MAX_IMAGE_PIXELS)
            throw new Error('Invalid image dimensions');
        this.state = {crop: {x: 0, y: 0, width, height}, annotations: []};
        this.past = [];
        this.future = [];
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

    add(annotation) {
        if (!tools.includes(annotation.type) || ['move', 'crop'].includes(annotation.type) ||
            !/^#[a-f\d]{6}$/iu.test(annotation.color) || !Number.isFinite(annotation.width) ||
            annotation.width < 1 || annotation.width > 72 || this.state.annotations.length >= 128)
            throw new Error('Invalid annotation');
        const [x, y] = this.point(annotation.x, annotation.y);
        const [x2, y2] = this.point(annotation.x2, annotation.y2);
        const text = typeof annotation.text === 'string' ? annotation.text.slice(0, 500) : '';
        const points = (annotation.points ?? []).map(p => this.point(...p));
        if (points.length + this.state.annotations.reduce((sum, a) => sum + a.points.length, 0) > 4096)
            throw new Error('Too many annotation points');
        const state = clone(this.state);
        state.annotations.push({type: annotation.type, x, y, x2, y2, color: annotation.color,
            width: annotation.width, text, points});
        this._commit(state);
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

export function imageTransform(crop, width, height, zoom = 1, pan = [0, 0]) {
    const scale = Math.min(width / crop.width, height / crop.height) * zoom;
    return {scale, x: (width - crop.width * scale) / 2 + pan[0],
        y: (height - crop.height * scale) / 2 + pan[1]};
}

export function imagePoint(crop, transform, x, y) {
    return [crop.x + (x - transform.x) / transform.scale,
        crop.y + (y - transform.y) / transform.scale];
}
