// SPDX-License-Identifier: GPL-3.0-or-later
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_TOTAL_BYTES = 32 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8192;
export const MAX_IMAGE_PIXELS = 16 * 1024 * 1024;

function dimensions(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS)
        throw new Error('Image dimensions exceed the limit');
    return {width, height};
}

// Inspect dimensions before invoking a native image decoder. The adapter also
// decodes a bounded thumbnail, so invalid compressed data never enters history.
export function imageInfo(bytes, mime) {
    if (!bytes || typeof bytes.length !== 'number' || bytes.length < 24 || bytes.length > MAX_IMAGE_BYTES)
        throw new Error('Invalid image size');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === 'image/png') {
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!signature.every((value, index) => bytes[index] === value) ||
            view.getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR' || bytes.length < 45)
            throw new Error('Invalid PNG header');
        const result = dimensions(view.getUint32(16), view.getUint32(20));
        const depths = {0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16]};
        if (!depths[bytes[25]]?.includes(bytes[24]) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1)
            throw new Error('Invalid PNG format');
        let offset = 8;
        let data = false;
        while (offset + 12 <= bytes.length) {
            const size = view.getUint32(offset);
            const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
            if (size > bytes.length - offset - 12 || (offset > 8 && type === 'IHDR'))
                throw new Error('Invalid PNG chunk');
            if (type === 'IDAT')
                data = true;
            offset += size + 12;
            if (type === 'IEND') {
                if (size !== 0 || !data || offset !== bytes.length)
                    throw new Error('Invalid PNG ending');
                return result;
            }
        }
        throw new Error('Incomplete PNG');
    }
    if (mime === 'image/jpeg') {
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
            bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9)
            throw new Error('Invalid JPEG signature');
        let offset = 2;
        while (offset + 4 < bytes.length) {
            if (bytes[offset++] !== 0xff)
                throw new Error('Invalid JPEG marker');
            while (bytes[offset] === 0xff)
                offset++;
            const marker = bytes[offset++];
            if (marker === 0xda || marker === 0xd9)
                break;
            const size = view.getUint16(offset);
            if (size < 2 || offset + size > bytes.length)
                throw new Error('Invalid JPEG segment');
            if ([0xc0, 0xc1, 0xc2].includes(marker)) {
                if (size < 8 || bytes[offset + 2] !== 8 ||
                    ![1, 3, 4].includes(bytes[offset + 7]) || size !== 8 + 3 * bytes[offset + 7])
                    throw new Error('Invalid JPEG frame');
                return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
            }
            offset += size;
        }
    }
    throw new Error('Unsupported image format');
}

export function validImageRecord(image) {
    try {
        dimensions(image.width, image.height);
        return image.kind === 'image' && ['image/png', 'image/jpeg'].includes(image.mime) &&
            typeof image.digest === 'string' && /^[a-f0-9]{64}$/u.test(image.digest) &&
            Number.isInteger(image.bytes) && image.bytes >= 24 && image.bytes <= MAX_IMAGE_BYTES;
    } catch {
        return false;
    }
}

export function imageFilename(image) {
    if (!validImageRecord(image))
        throw new Error('Invalid image record');
    return `${image.digest}.${image.mime === 'image/png' ? 'png' : 'jpg'}`;
}
