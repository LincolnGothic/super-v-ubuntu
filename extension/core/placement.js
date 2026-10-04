// SPDX-License-Identifier: GPL-3.0-or-later
export function placeNearPointer(pointer, area, size, gap = 12) {
    const [px, py] = pointer;
    const [width, height] = size;
    const bottom = area.y + area.height - gap;
    const y = py + gap + height <= bottom ? py + gap : py - height - gap;
    return clampPanelPosition([px + gap, y], area, [width, height], gap);
}

export function clampPanelPosition(point, area, size, gap = 12) {
    const clamp = (value, low, high) => Math.max(low, Math.min(value, Math.max(low, high)));
    return {x: clamp(point[0], area.x + gap, area.x + area.width - size[0] - gap),
        y: clamp(point[1], area.y + gap, area.y + area.height - size[1] - gap)};
}

export function rememberWindowClick(window, frame, point) {
    if (!window || !frame || !point.every(Number.isFinite) || !pointInRect(point, [frame.x, frame.y], [frame.width, frame.height]))
        return null;
    return {window, x: point[0] - frame.x, y: point[1] - frame.y, width: frame.width, height: frame.height};
}

export function resolveWindowClick(click, window, frame, pointer) {
    // Moving a window preserves its input point. Resizing can reflow its UI,
    // so use the pointer until the application receives another click.
    if (click && window === click.window && frame?.width === click.width && frame?.height === click.height)
        return [frame.x + click.x, frame.y + click.y];
    return pointer.slice(0, 2);
}

export function pointInRect(point, position, size) {
    return point[0] >= position[0] && point[1] >= position[1] &&
        point[0] < position[0] + size[0] && point[1] < position[1] + size[1];
}
