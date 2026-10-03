// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';
import {MAX_TEXT_BYTES, matchesApplication} from './core/settings.js';
import {validateGif} from './core/gif.js';
import {imageInfo, MAX_IMAGE_BYTES} from './core/image.js';

const selectionType = Meta.SelectionType.SELECTION_CLIPBOARD;
const sensitive = ['x-kde-passwordmanagerhint', 'application/x-keepassxc',
    'application/x-keepass', 'x-gtk-password', 'application/x-bitwarden'];
const textMimes = ['text/plain;charset=utf-8', 'text/plain;charset=UTF-8',
    'UTF8_STRING', 'text/plain'];

export class ClipboardMonitor {
    constructor(settings, identifiers, onText, onImage = () => {}) {
        this.settings = settings;
        this.identifiers = identifiers;
        this.onText = onText;
        this.onImage = onImage;
        this.selection = global.display.get_selection();
        this.clipboard = St.Clipboard.get_default();
        this.generation = 0;
        this._ownWrites = new Map();
        this._active = true;
        this._suspended = false;
        this._cancellable = null;
        this._reads = new Set();
        this._handler = this.selection.connect('owner-changed', (_selection, type) => {
            if (type !== selectionType)
                return;
            this.invalidate();
            const generation = this.generation;
            if (this._suspended || !this.settings.get_boolean('history-enabled') ||
                matchesApplication(this.identifiers(), this.settings.get_strv('excluded-apps')))
                return;
            const image = (this.selection.get_mimetypes(selectionType) ?? [])
                .some(mime => ['image/png', 'image/jpeg'].includes(mime));
            (image ? this.readImage() : this.readText()).then(value => {
                if (!this._active || generation !== this.generation || value === null)
                    return;
                const key = image ? this._imageKey(value.bytes) : value;
                const now = GLib.get_monotonic_time();
                for (const [value, expiry] of this._ownWrites) {
                    if (expiry < now)
                        this._ownWrites.delete(value);
                }
                if (this._ownWrites.has(key))
                    return;
                if (this._suspended || !this.settings.get_boolean('history-enabled') ||
                    matchesApplication(this.identifiers(), this.settings.get_strv('excluded-apps')))
                    return;
                if (image)
                    this.onImage(value.bytes, value.mime);
                else
                    this.onText(value);
            }).catch(() => {});
        });
    }

    invalidate() {
        this.generation++;
        for (const cancellable of this._reads)
            cancellable.cancel();
        this._cancellable = null;
    }

    setSuspended(value) {
        this._suspended = value;
        this.invalidate();
    }

    async readText() {
        const mimes = this.selection.get_mimetypes(selectionType) ?? [];
        if (mimes.some(x => sensitive.some(hint => x.toLowerCase().includes(hint))))
            return null;
        const mime = textMimes.find(x => mimes.includes(x));
        if (!mime)
            return null;
        const bytes = await this._read(mime, MAX_TEXT_BYTES);
        try {
            return bytes === null ? null : new TextDecoder('utf-8', {fatal: true}).decode(bytes);
        } catch {
            return null;
        }
    }

    async readImage() {
        const mimes = this.selection.get_mimetypes(selectionType) ?? [];
        if (mimes.some(x => sensitive.some(hint => x.toLowerCase().includes(hint))))
            return null;
        const mime = ['image/png', 'image/jpeg'].find(value => mimes.includes(value));
        if (!mime)
            return null;
        const bytes = await this._read(mime, MAX_IMAGE_BYTES);
        try {
            imageInfo(bytes, mime);
            return {bytes, mime};
        } catch {
            return null;
        }
    }

    async _read(mime, limit) {
        const generation = this.generation;
        const cancellable = new Gio.Cancellable();
        this._reads.add(cancellable);
        this._cancellable = cancellable;
        let timedOut = false;
        const timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, limit === MAX_TEXT_BYTES ? 1000 : 3000, () => {
            timedOut = true;
            cancellable.cancel();
            return GLib.SOURCE_REMOVE;
        });
        const output = Gio.MemoryOutputStream.new_resizable();
        try {
            await new Promise((resolve, reject) => {
                this.selection.transfer_async(selectionType, mime, limit + 1,
                    output, cancellable, (selection, result) => {
                        try { resolve(selection.transfer_finish(result)); } catch (error) { reject(error); }
                    });
            });
            output.close(null);
            const bytes = output.steal_as_bytes().get_data();
            if (!this._active || generation !== this.generation || bytes.length > limit)
                return null;
            return bytes;
        } catch {
            return null;
        } finally {
            if (!timedOut)
                GLib.source_remove(timeout);
            this._reads.delete(cancellable);
            if (!output.is_closed())
                output.close(null);
            if (this._cancellable === cancellable)
                this._cancellable = null;
        }
    }

    write(text, suppress = true) {
        if (suppress)
            this._suppress(text);
        this.clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    writeGif(bytes) {
        validateGif(bytes);
        this.clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/gif', new GLib.Bytes(bytes));
    }

    _imageKey(bytes) {
        return `image:${GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA256, new GLib.Bytes(bytes))}`;
    }

    _suppress(key) {
        this._ownWrites.set(key, GLib.get_monotonic_time() + 3_000_000);
        if (this._ownWrites.size > 4)
            this._ownWrites.delete(this._ownWrites.keys().next().value);
    }

    writeImage(bytes, mime) {
        imageInfo(bytes, mime);
        this._suppress(this._imageKey(bytes));
        this.clipboard.set_content(St.ClipboardType.CLIPBOARD, mime, new GLib.Bytes(bytes));
    }

    destroy() {
        this._active = false;
        this.invalidate();
        for (const cancellable of this._reads)
            cancellable.cancel();
        this.selection.disconnect(this._handler);
        this._ownWrites.clear();
        this.onText = null;
        this.onImage = null;
    }
}
