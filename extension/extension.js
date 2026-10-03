// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import {emojiLocale} from './core/localization.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {gettext as _} from './translations.js';
import {History} from './core/history.js';
import {EmojiIndex} from './core/emoji.js';
import {StateStore} from './storage.js';
import {ClipboardMonitor} from './clipboard.js';
import {PasteBackend} from './paste.js';
import {SuperVPopup} from './popup.js';
import {GifLibrary} from './gifs.js';

export default class SuperVExtension extends Extension {
    enable() {
        this._active = true;
        this._epoch = (this._epoch ?? 0) + 1;
        this._stateRevision = 0;
        this._ready = false;
        this._selectionEpoch = 0;
        this.settings = this.getSettings();
        this.gifs = new GifLibrary(this.settings);
        this.history = new History(this.settings.get_int('history-limit'));
        this.pendingRestore = null;
        this._target = null;
        this._stateCancellable = new Gio.Cancellable();
        this.store = new StateStore(undefined, message => {
            if (this._active)
                Main.notify('Super V', _(message));
        });
        this.store.persist = this.settings.get_boolean('remember-history');
        this._settingsHandler = this.settings.connect('changed', (_settings, key) => this._settingsChanged(key));
        const epoch = this._epoch;
        this._start(epoch).catch(() => {
            if (this._active && epoch === this._epoch) {
                this.disable();
                Main.notify('Super V', _('Could not initialize the extension. Disable and re-enable it.'));
            }
        });
    }

    async _start(epoch) {
        const revision = this._stateRevision;
        const dataFile = this.dir.get_child('data').get_child('emoji.json');
        const contents = await new Promise((resolve, reject) => {
            dataFile.load_contents_async(this._stateCancellable, (file, result) => {
                try { resolve(file.load_contents_finish(result)[1]); } catch (error) { reject(error); }
            });
        });
        if (!this._active || epoch !== this._epoch)
            return;
        const data = JSON.parse(new TextDecoder().decode(contents));
        let annotations = {};
        const locale = emojiLocale(GLib.get_language_names());
        if (locale !== 'en') {
            try {
                const file = this.dir.get_child('data').get_child('emoji-locales').get_child(`${locale}.json`);
                const bytes = await new Promise((resolve, reject) => {
                    file.load_contents_async(this._stateCancellable, (source, result) => {
                        try { resolve(source.load_contents_finish(result)[1]); } catch (error) { reject(error); }
                    });
                });
                annotations = JSON.parse(new TextDecoder().decode(bytes)).annotations;
            } catch {
                // An absent catalog falls back to the bundled English data.
            }
        }
        if (!this._active || epoch !== this._epoch)
            return;
        this.emoji = new EmojiIndex(data.emoji, [], annotations);
        const store = this.store;
        const raw = store.persist ? await store.load(this._stateCancellable) : null;
        if (!this._active || epoch !== this._epoch)
            return;
        // Settings may have changed while the read was in flight.
        if (raw && store.persist && revision === this._stateRevision) {
            const loaded = History.deserialize(raw, this.settings.get_int('history-limit'));
            this.history = loaded.history;
            this.emoji.setRecent(loaded.recent);
            if (loaded.recovered) {
                await store.erase();
                Main.notify('Super V', _('Invalid stored history was removed.'));
            }
        } else if (!store.persist) {
            await store.erase();
        }
        if (!this._active || epoch !== this._epoch)
            return;
        this._ready = true;
        const clearRequest = this.settings.get_string('clear-request');
        if (clearRequest) {
            this.clear(clearRequest.startsWith('all:'));
            this.settings.set_string('clear-request', '');
        }
        this.clipboard = new ClipboardMonitor(this.settings,
            () => this.identifiers(global.display.focus_window), text => {
                if (this.history.add(text))
                    this.changed();
            });
        this.pasteBackend = new PasteBackend(this.settings,
            window => this.identifiers(window), () => {
                if (this._active)
                    Main.notify('Super V', _('Copied to clipboard. Use your application’s paste shortcut.'));
            });
        this.popup = new SuperVPopup(this);
        this._sessionHandler = Main.sessionMode.connect('updated', () => {
            const suspended = Main.sessionMode.isLocked || Main.sessionMode.isGreeter;
            this.clipboard?.setSuspended(suspended);
            if (suspended) {
                this.popup?.close();
                this.pasteBackend?.cancel();
                this.pendingRestore = null;
            }
        });
        Main.wm.addKeybinding('open-popup', this.settings, Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.POPUP, () => this.toggle());
        this._binding = true;
    }

    identifiers(window) {
        if (!window)
            return [];
        const app = Shell.WindowTracker.get_default().get_window_app(window);
        return [app?.get_id(), window.get_wm_class(), window.get_wm_class_instance()]
            .filter(x => typeof x === 'string');
    }

    toggle() {
        this._selectionEpoch++;
        if (![ModalDialog.State.OPENED, ModalDialog.State.OPENING].includes(this.popup.state)) {
            this._target = global.display.focus_window;
            this.pasteBackend.cancel();
            this.popup.showPanel();
        } else {
            this.popup.close();
        }
    }

    changed() {
        if (this.emoji && this._ready)
            this.store.save(this.history.toJSON(this.emoji.recent));
        this.popup?.refresh();
    }

    clear(includePinned) {
        this._stateRevision++;
        this.clipboard?.invalidate();
        this.history.clear(includePinned);
        if (includePinned) {
            this.emoji?.setRecent([]);
            this.pendingRestore = null;
        }
        this.changed();
    }

    pin(id) {
        if (!this.history.togglePin(id))
            Main.notify('Super V', _('You can pin up to 100 entries.'));
        this.changed();
    }

    deleteEntry(id) {
        this.history.delete(id);
        this.changed();
    }

    async select(entry, emoji) {
        const epoch = this._epoch;
        const selectionEpoch = ++this._selectionEpoch;
        const target = this._target;
        this.popup.close();
        if (emoji) {
            const generation = this.clipboard.generation;
            const previous = await this.clipboard.readText();
            if (!this._active || epoch !== this._epoch || selectionEpoch !== this._selectionEpoch ||
                generation !== this.clipboard.generation)
                return;
            if (!this.pendingRestore || this.pendingRestore.emoji !== previous)
                this.pendingRestore = previous === null ? null : {previous, emoji: entry.text};
            else
                this.pendingRestore.emoji = entry.text;
            this.emoji.use(entry.text);
        } else {
            this.pendingRestore = null;
            this.history.add(entry.text);
        }
        this.clipboard.write(entry.text);
        this.changed();
        this.pasteBackend.paste(target);
    }

    async restoreClipboard() {
        const restore = this.pendingRestore;
        if (!restore)
            return;
        const epoch = this._epoch;
        const generation = this.clipboard.generation;
        const current = await this.clipboard.readText();
        if (!this._active || epoch !== this._epoch)
            return;
        if (generation === this.clipboard.generation && current === restore.emoji)
            this.clipboard.write(restore.previous);
        else
            Main.notify('Super V', _('Clipboard changed; the newer clipboard was preserved.'));
        this.pendingRestore = null;
        this.popup.refresh();
    }

    async selectGif(entry) {
        const epoch = this._epoch;
        const selectionEpoch = ++this._selectionEpoch;
        const generation = this.clipboard.generation;
        const target = this._target;
        this.popup.close();
        try {
            const bytes = await this.gifs.read(entry, this._stateCancellable);
            if (!this._active || epoch !== this._epoch || selectionEpoch !== this._selectionEpoch ||
                generation !== this.clipboard.generation)
                return;
            this.pendingRestore = null;
            this.clipboard.writeGif(bytes);
            this.pasteBackend.paste(target);
        } catch {
            if (this._active && epoch === this._epoch)
                Main.notify('Super V', _('Could not read that GIF. Re-add it in Settings or choose another file.'));
        }
    }

    _settingsChanged(key) {
        if (key === 'history-limit') {
            this.history.setLimit(this.settings.get_int(key));
            this.changed();
        } else if (key === 'remember-history') {
            this._stateRevision++;
            this.store.persist = this.settings.get_boolean(key);
            if (!this.store.persist)
                this.store.erase();
            else
                this.changed();
        } else if (key === 'history-enabled' || key === 'excluded-apps') {
            this.clipboard?.invalidate();
            this.popup?.refresh();
        } else if (key === 'clear-request') {
            const request = this.settings.get_string(key);
            if (request && this._ready) {
                this.clear(request.startsWith('all:'));
                this.settings.set_string(key, '');
            }
        } else if (key === 'auto-paste') {
            this.pasteBackend?.cancel();
        } else if (key === 'gif-files') {
            this.popup?.refresh();
        } else if (key === 'popup-position') {
            this.popup?.positionPanel();
        }
    }

    disable() {
        this._active = false;
        this._epoch++;
        this._stateCancellable?.cancel();
        if (this._binding)
            Main.wm.removeKeybinding('open-popup');
        this._binding = false;
        if (this._sessionHandler)
            Main.sessionMode.disconnect(this._sessionHandler);
        this._sessionHandler = 0;
        this.settings?.disconnect(this._settingsHandler);
        this.clipboard?.destroy();
        this.pasteBackend?.destroy();
        this.popup?.destroy();
        if (this.emoji && this._ready)
            this.store?.save(this.history.toJSON(this.emoji.recent));
        this.popup = this.clipboard = this.pasteBackend = this.settings = null;
        this.history = this.emoji = this.store = this.pendingRestore = this._target = this.gifs = null;
        this._stateCancellable = null;
    }
}
