// SPDX-License-Identifier: GPL-3.0-or-later
export function moveGridSelection(index, count, columns, direction) {
    if (!count)
        return 0;
    const last = count - 1;
    const row = Math.floor(index / columns);
    if (direction === 'up')
        return row === 0 ? index : index - columns;
    if (direction === 'down')
        return row === Math.floor(last / columns) ? index : Math.min(last, index + columns);
    return Math.max(0, Math.min(last, index + (direction === 'right' ? 1 : -1)));
}
