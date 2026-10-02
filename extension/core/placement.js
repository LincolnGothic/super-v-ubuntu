// SPDX-License-Identifier: GPL-3.0-or-later
export function placeNearPointer(pointer, area, size, gap = 12) {
    const [px, py] = pointer;
    const [width, height] = size;
    const clamp = (value, low, high) => Math.max(low, Math.min(value, Math.max(low, high)));
    const bottom = area.y + area.height - gap;
    const y = py + gap + height <= bottom ? py + gap : py - height - gap;
    return {
        x: clamp(px + gap, area.x + gap, area.x + area.width - width - gap),
        y: clamp(y, area.y + gap, bottom - height),
    };
}

export function pointInRect(point, position, size) {
    return point[0] >= position[0] && point[1] >= position[1] &&
        point[0] < position[0] + size[0] && point[1] < position[1] + size[1];
}
