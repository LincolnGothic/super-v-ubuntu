// SPDX-License-Identifier: GPL-3.0-or-later
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {imageInfo, imageFilename} from './core/image.js';

export class ImageLibrary {
    constructor() {
        this.items = new Map();
    }

    add(bytes, mime) {
        const {width, height} = imageInfo(bytes, mime);
        const digest = GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA256, new GLib.Bytes(bytes));
        const existing = this.items.get(digest);
        if (existing)
            return existing.record;
        const loader = GdkPixbuf.PixbufLoader.new_with_mime_type(mime);
        let mismatch = false;
        loader.connect('size-prepared', (_loader, actualWidth, actualHeight) => {
            mismatch = actualWidth !== width || actualHeight !== height;
            const scale = Math.min(1, 192 / width, 112 / height);
            loader.set_size(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
        });
        try {
            loader.write(bytes);
            loader.close();
        } catch (error) {
            try { loader.close(); } catch { /* The failed loader still needs closing. */ }
            throw error;
        }
        const thumbnail = loader.get_pixbuf();
        if (!thumbnail || mismatch)
            throw new Error('Could not decode image');
        const record = {kind: 'image', mime, digest, bytes: bytes.length, width, height};
        const preview = thumbnail.save_to_bufferv('png', [], [])[1];
        const gicon = Gio.BytesIcon.new(new GLib.Bytes(preview));
        this.items.set(digest, {record, bytes, gicon});
        return record;
    }

    get(entry) {
        return this.items.get(entry.digest);
    }

    retain(entries) {
        const keep = new Set(entries.filter(entry => entry.kind === 'image').map(entry => entry.digest));
        for (const digest of this.items.keys()) {
            if (!keep.has(digest))
                this.items.delete(digest);
        }
    }

    snapshot() {
        return new Map([...this.items.values()].map(item => [imageFilename(item.record), item.bytes]));
    }
}
