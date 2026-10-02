// SPDX-License-Identifier: GPL-3.0-or-later
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;
export const MAX_PINNED = 100;
export const MAX_TEXT_BYTES = 16 * 1024;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
export const MAX_STATE_BYTES = 16 * 1024 * 1024;

export function validateLimit(value) {
    return Number.isInteger(value) && value >= 1 && value <= MAX_LIMIT
        ? value : DEFAULT_LIMIT;
}

export function validateAppList(value) {
    if (!Array.isArray(value))
        return [];
    return [...new Set(value.filter(x => typeof x === 'string' &&
        x.length > 0 && x.length <= 200 && !/[\r\n\0]/u.test(x))
        .map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
}

export function parsePasteOverrides(value) {
    try {
        const parsed = JSON.parse(value);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
            return {};
        return Object.fromEntries(Object.entries(parsed).filter(([key, shortcut]) =>
            key.length > 0 && key.length <= 200 &&
            ['ctrl-v', 'ctrl-shift-v', 'shift-insert', 'manual'].includes(shortcut))
            .slice(0, 100).map(([key, shortcut]) => [key.toLowerCase(), shortcut]));
    } catch {
        return {};
    }
}

export function matchesApplication(identifiers, excluded) {
    const names = validateAppList(identifiers);
    return validateAppList(excluded).some(x => names.includes(x));
}
