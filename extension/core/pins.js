// SPDX-License-Identifier: GPL-3.0-or-later
import {imageInfo, MAX_IMAGE_TOTAL_BYTES} from './image.js';
export const MAX_SCREEN_PINS = 5;
export class PinBudget {
    constructor() { this.items = new Map(); this.nextId = 1; }
    add(bytes, mime) {
        const info = imageInfo(bytes, mime);
        if (this.items.size >= MAX_SCREEN_PINS || bytes.length + [...this.items.values()].reduce((sum, p) => sum + p.bytes, 0) > MAX_IMAGE_TOTAL_BYTES)
            throw new Error('Screen pin limit reached');
        const id = this.nextId++;
        this.items.set(id, {bytes: bytes.length, ...info});
        return id;
    }
    delete(id) { this.items.delete(id); }
    clear() { this.items.clear(); }
}
export function pinGeometry(width, height, zoom, area, x, y) {
    const fit = Math.min(1, 360 / width, 280 / height);
    const scale = Math.min(fit * Math.max(0.25, Math.min(4, zoom)),
        Math.max(1, area.width - 34) / width, Math.max(1, area.height - 70) / height);
    const imageWidth = Math.max(1, Math.round(width * scale)), imageHeight = Math.max(1, Math.round(height * scale));
    const rootWidth = Math.min(area.width - 24, Math.max(240, imageWidth + 10)), rootHeight = imageHeight + 46;
    return {imageWidth, imageHeight, width: rootWidth, height: rootHeight,
        x: Math.max(area.x + 12, Math.min(area.x + area.width - rootWidth - 12, x)),
        y: Math.max(area.y + 12, Math.min(area.y + area.height - rootHeight - 12, y))};
}
