// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';
import {MAX_TEXT_BYTES, matchesApplication} from './core/settings.js';
import {validateGif} from './core/gif.js';

const selectionType = Meta.SelectionType.SELECTION_CLIPBOARD;
const sensitive = ['x-kde-passwordmanagerhint', 'application/x-keepassxc',
    'application/x-keepass', 'x-gtk-password', 'application/x-bitwarden'];
const textMimes = ['text/plain;charset=utf-8', 'text/plain;charset=UTF-8',
    'UTF8_STRING', 'text/plain'];

export class ClipboardMonitor {
    constructor(settings, identifiers, onText) {
        this.settings = settings;
        this.identifiers = identifiers;
        this.onText = onText;
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
            this.readText().then(text => {
                if (!this._active || generation !== this.generation || text === null)
                    return;
                const now = GLib.get_monotonic_time();
                for (const [value, expiry] of this._ownWrites) {
                    if (expiry < now)
                        this._ownWrites.delete(value);
                }
                if (this._ownWrites.has(text))
                    return;
                if (this._suspended || !this.settings.get_boolean('history-enabled') ||
                    matchesApplication(this.identifiers(), this.settings.get_strv('excluded-apps')))
                    return;
                this.onText(text);
            }).catch(() => {});
        });
    }

    invalidate() {
        this.generation++;
        this._cancellable?.cancel();
        this._cancellable = null;
    }

    setSuspended(value) {
        this._suspended = value;
        this.invalidate();
    }

    async readText() {
        const generation = this.generation;
        const mimes = this.selection.get_mimetypes(selectionType) ?? [];
        if (mimes.some(x => sensitive.some(hint => x.toLowerCase().includes(hint))))
            return null;
        const mime = textMimes.find(x => mimes.includes(x));
        if (!mime)
            return null;
        const cancellable = new Gio.Cancellable();
        this._reads.add(cancellable);
        this._cancellable = cancellable;
        let timedOut = false;
        const timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            timedOut = true;
            cancellable.cancel();
            return GLib.SOURCE_REMOVE;
        });
        const output = Gio.MemoryOutputStream.new_resizable();
        try {
            await new Promise((resolve, reject) => {
                this.selection.transfer_async(selectionType, mime, MAX_TEXT_BYTES + 1,
                    output, cancellable, (selection, result) => {
                        try { resolve(selection.transfer_finish(result)); } catch (error) { reject(error); }
                    });
            });
            output.close(null);
            const bytes = output.steal_as_bytes().get_data();
            if (!this._active || generation !== this.generation || bytes.length > MAX_TEXT_BYTES)
                return null;
            return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
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
        if (suppress) {
            this._ownWrites.set(text, GLib.get_monotonic_time() + 3_000_000);
            if (this._ownWrites.size > 4)
                this._ownWrites.delete(this._ownWrites.keys().next().value);
        }
        this.clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    writeGif(bytes) {
        validateGif(bytes);
        this.clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/gif', new GLib.Bytes(bytes));
    }

    destroy() {
        this._active = false;
        this.invalidate();
        for (const cancellable of this._reads)
            cancellable.cancel();
        this.selection.disconnect(this._handler);
        this._ownWrites.clear();
        this.onText = null;
    }
}
