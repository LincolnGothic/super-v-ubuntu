// SPDX-License-Identifier: GPL-3.0-or-later
export const MAX_GIF_BYTES = 8 * 1024 * 1024;
export const MAX_GIF_FILES = 40;

export function validateGif(bytes) {
    if (!bytes || bytes.length < 14 || bytes.length > MAX_GIF_BYTES)
        throw new Error('Choose a GIF file smaller than 8 MiB.');
    const header = String.fromCharCode(...bytes.slice(0, 6));
    const width = bytes[6] | bytes[7] << 8;
    const height = bytes[8] | bytes[9] << 8;
    if (!['GIF87a', 'GIF89a'].includes(header) || !width || !height ||
        width > 2048 || height > 2048 || bytes[bytes.length - 1] !== 0x3b)
        throw new Error('Choose a valid GIF with dimensions up to 2048 × 2048.');
    return {width, height};
}

export function gifPaths(paths) {
    return [...new Set(paths.filter(x => typeof x === 'string' && x.startsWith('/') &&
        !x.includes('\0') && /\.gif$/iu.test(x)))].slice(0, MAX_GIF_FILES);
}
