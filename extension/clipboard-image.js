// SPDX-License-Identifier: GPL-3.0-or-later
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {imageInfo, MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS} from './core/image.js';

// Try portable formats first. Some Qt/Electron apps advertise only an alias,
// a bitmap, or a local image file even though ordinary paste accepts the image.
export const imageMimes = ['image/png', 'image/x-png', 'image/jpeg', 'image/jpg',
    'image/pjpeg', 'image/bmp', 'image/x-bmp', 'image/x-MS-bmp', 'image/webp'];
export const fileMimes = ['text/uri-list', 'x-special/gnome-copied-files'];

export function normalizeClipboardImage(bytes, mime = null) {
    if (!bytes || bytes.length > MAX_IMAGE_BYTES)
        throw new Error('Image exceeds the byte limit');
    // Preserve original PNG/JPEG data, including when an app mislabeled it.
    for (const portable of ['image/png', 'image/jpeg']) {
        try { imageInfo(bytes, portable); return {bytes, mime: portable}; } catch {}
    }
    if (mime && !imageMimes.includes(mime))
        throw new Error('Unsupported clipboard image');
    const loader = GdkPixbuf.PixbufLoader.new();
    let validSize = false;
    loader.connect('size-prepared', (_loader, width, height) => {
        validSize = width > 0 && height > 0 && width <= MAX_IMAGE_DIMENSION &&
            height <= MAX_IMAGE_DIMENSION && width * height <= MAX_IMAGE_PIXELS;
        if (!validSize) loader.set_size(1, 1);
    });
    try {
        loader.write(bytes);
        loader.close();
    } catch (error) {
        try { loader.close(); } catch {}
        throw error;
    }
    const pixbuf = loader.get_pixbuf();
    const format = loader.get_format()?.get_name();
    if (!validSize || !pixbuf || !['png', 'jpeg', 'bmp', 'webp'].includes(format))
        throw new Error('Unsupported clipboard image');
    const png = pixbuf.save_to_bufferv('png', [], [])[1];
    imageInfo(png, 'image/png');
    return {bytes: png, mime: 'image/png'};
}

export function localImageFile(bytes, mime) {
    let lines = new TextDecoder('utf-8', {fatal: true}).decode(bytes).split(/\r?\n/u)
        .map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    if (mime === 'x-special/gnome-copied-files') {
        if (!['copy', 'cut'].includes(lines.shift())) return null;
    }
    // One explicit local file only: never fetch links or expand file collections.
    if (lines.length !== 1 || !/^file:\/\/(?:localhost)?\//iu.test(lines[0])) return null;
    const file = Gio.File.new_for_uri(lines[0]);
    const path = file.get_path();
    if (!path || !/\.(?:png|jpe?g|bmp|webp)$/iu.test(path)) return null;
    return file;
}

export async function readImageFile(file, cancellable) {
    const info = await new Promise((resolve, reject) => {
        file.query_info_async('standard::type,standard::size', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
                try { resolve(source.query_info_finish(result)); } catch (error) { reject(error); }
            });
    });
    if (info.get_file_type() !== Gio.FileType.REGULAR || info.get_size() > MAX_IMAGE_BYTES)
        throw new Error('Not a bounded regular image file');
    const stream = await new Promise((resolve, reject) => {
        file.read_async(GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
            try { resolve(source.read_finish(result)); } catch (error) { reject(error); }
        });
    });
    try {
        const chunks = [];
        let size = 0;
        while (size <= MAX_IMAGE_BYTES) {
            const bytes = await new Promise((resolve, reject) => {
                stream.read_bytes_async(Math.min(65536, MAX_IMAGE_BYTES + 1 - size),
                    GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
                        try { resolve(source.read_bytes_finish(result)); } catch (error) { reject(error); }
                    });
            });
            const chunk = bytes.get_data();
            if (!chunk.length) break;
            chunks.push(chunk); size += chunk.length;
        }
        if (size > MAX_IMAGE_BYTES) throw new Error('Image exceeds the byte limit');
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        return normalizeClipboardImage(bytes);
    } finally {
        stream.close(null);
    }
}
