// SPDX-License-Identifier: GPL-3.0-or-later
import {annotationLocale} from './core/localization.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {gettext as _, initTranslations} from './translations.js';
import {History} from './core/history.js';
import {EmojiIndex} from './core/emoji.js';
import {StateStore} from './storage.js';
import {ClipboardMonitor} from './clipboard.js';
import {PasteBackend} from './paste.js';
import {SuperVPopup} from './popup.js';
import {GifLibrary} from './gifs.js';
import {ImageLibrary} from './images.js';
import {EditorBridge} from './editor-bridge.js';

export default class SuperVExtension extends Extension {
    enable() {
        this._active = true;
        this._epoch = (this._epoch ?? 0) + 1;
        this._stateRevision = 0;
        this._ready = false;
        this._selectionEpoch = 0;
        this._languageRevision = 0;
        this.settings = this.getSettings();
        initTranslations(this.dir, this.settings.get_string('ui-language'));
        this.gifs = new GifLibrary(this.settings);
        this.images = new ImageLibrary();
        this.history = new History(this.settings.get_int('history-limit'));
        this.pendingRestore = null;
        this._target = null;
        this._stateCancellable = new Gio.Cancellable();
        this.store = new StateStore(undefined, message => {
            if (this._active)
                Main.notify('Super V', _(message));
        });
        this.store.persist = this._shouldPersist();
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
        this._emojiRecords = data.emoji;
        do {
            await this._updateLanguage();
        } while (this._active && epoch === this._epoch &&
            this._appliedLanguage !== this.settings.get_string('ui-language'));
        if (!this._active || epoch !== this._epoch)
            return;
        const store = this.store;
        // A rapid disable/re-enable must not let the previous instance’s
        // pending save or erase race with this instance’s disk state.
        await this._storageBarrier;
        if (!this._active || epoch !== this._epoch)
            return;
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
            let missing = false;
            for (const entry of [...this.history.entries]) {
                if (entry.kind !== 'image')
                    continue;
                try {
                    const bytes = await store.loadImage(entry, this._stateCancellable);
                    if (!this._active || epoch !== this._epoch)
                        return;
                    if (!store.persist || revision !== this._stateRevision)
                        break;
                    const record = this.images.add(bytes, entry.mime);
                    if (record.width !== entry.width || record.height !== entry.height)
                        throw new Error('Invalid image dimensions');
                } catch {
                    if (!this._active || epoch !== this._epoch)
                        return;
                    this.history.delete(entry.id);
                    missing = true;
                }
            }
            // Persistence changes during loading must not leave unusable image
            // entries or import more saved state after a privacy change.
            this.history.entries = this.history.entries.filter(entry =>
                entry.kind !== 'image' || this.images.get(entry));
            if (missing)
                Main.notify('Super V', _('Some saved images could not be read and were removed.'));
        } else if (!store.persist) {
            await store.erase();
        }
        if (!this._active || epoch !== this._epoch)
            return;
        if (this._appliedLanguage !== this.settings.get_string('ui-language')) {
            do {
                await this._updateLanguage();
            } while (this._active && epoch === this._epoch &&
                this._appliedLanguage !== this.settings.get_string('ui-language'));
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
            }, (bytes, mime) => {
                try {
                    const image = this.images.add(bytes, mime);
                    this.history.addImage(image);
                    this.changed();
                } catch {
                    // Invalid or oversized image data is ignored without logs.
                }
            });
        this.editor = new EditorBridge(this.dir, bytes => {
            if (!this._active || Main.sessionMode.isLocked || Main.sessionMode.isGreeter)
                return;
            this.pendingRestore = null;
            this.clipboard.writeImage(bytes, 'image/png');
            if (this.settings.get_boolean('history-enabled')) {
                const image = this.images.add(bytes, 'image/png');
                this.history.addImage(image);
                this.changed();
            }
        }, () => {
            if (this._active)
                Main.notify('Super V', _('Could not open or communicate with the screenshot editor.'));
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
                this.editor?.close();
                this._cancelScreenshot();
            }
        });
        Main.wm.addKeybinding('open-popup', this.settings, Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.POPUP, () => this.toggle());
        this._binding = true;
        Main.wm.addKeybinding('take-screenshot', this.settings, Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.POPUP, () => this.takeScreenshot());
        this._screenshotBinding = true;
        this.changed();
    }

    async _updateLanguage() {
        const revision = ++this._languageRevision;
        const epoch = this._epoch;
        const choice = this.settings.get_string('ui-language');
        const language = initTranslations(this.dir, choice);
        if (!this._emojiRecords)
            return;
        let annotations = {};
        const locale = annotationLocale(language);
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
        if (!this._active || epoch !== this._epoch || revision !== this._languageRevision ||
            choice !== this.settings.get_string('ui-language'))
            return;
        this._appliedLanguage = choice;
        this.emoji = new EmojiIndex(this._emojiRecords, this.emoji?.recent ?? [], annotations);
        this.popup?.retranslate();
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
        this.images?.retain(this.history.entries);
        if (this.emoji && this._ready)
            this.store.save(this.history.toJSON(this.emoji.recent), this.images?.snapshot());
        this.popup?.refresh();
    }

    clear(includePinned) {
        this.editor?.close();
        this._cancelScreenshot();
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
        if (this._editorEntryId === id)
            this.editor?.close();
        this.history.delete(id);
        this.changed();
    }

    async select(entry, emoji) {
        const epoch = this._epoch;
        const selectionEpoch = ++this._selectionEpoch;
        const target = this._target;
        this.popup.close();
        if (!emoji && entry.kind === 'image') {
            const image = this.images.get(entry);
            if (!image || !this.history.entries.includes(entry))
                return;
            this.pendingRestore = null;
            this.history.addImage(entry);
            this.clipboard.writeImage(image.bytes, entry.mime);
            this.changed();
            this.pasteBackend.paste(target);
            return;
        }
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

    editImage(entry) {
        const image = this.images?.get(entry);
        if (image && this.history.entries.includes(entry))
            this._openEditor(image.bytes, entry.mime, entry.id);
    }

    _openEditor(bytes, mime, id = null) {
        if (!this._active || !this._ready || Main.sessionMode.isLocked || Main.sessionMode.isGreeter)
            return;
        this._selectionEpoch++;
        this.popup.close();
        this.pasteBackend.cancel();
        this.pendingRestore = null;
        this._editorEntryId = id;
        try { this.editor.open(bytes, mime); }
        catch { Main.notify('Super V', _('Could not open or communicate with the screenshot editor.')); }
    }

    _clearScreenshotSignals() {
        if (this._captureTimeout) GLib.source_remove(this._captureTimeout);
        this._captureTimeout = 0;
        for (const id of this._captureSignals ?? [])
            Main.screenshotUI.disconnect(id);
        this._captureSignals = [];
    }

    _cancelScreenshot() {
        this._captureSerial = (this._captureSerial ?? 0) + 1;
        this._clearScreenshotSignals();
        if (this._screenshotSource)
            GLib.source_remove(this._screenshotSource);
        this._screenshotSource = 0;
    }

    takeScreenshot() {
        if (!this._active || !this._ready || Main.sessionMode.isLocked || Main.sessionMode.isGreeter)
            return;
        this._selectionEpoch++;
        this.popup.close();
        this.pasteBackend.cancel();
        this.pendingRestore = null;
        this._clearScreenshotSignals();
        const serial = this._captureSerial = (this._captureSerial ?? 0) + 1;
        const epoch = this._epoch;
        if (this._screenshotSource)
            GLib.source_remove(this._screenshotSource);
        // Release the picker modal grab and let it disappear before GNOME
        // freezes the screen to present its native capture controls.
        this._screenshotSource = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._screenshotSource = 0;
            if (this._active && !Main.sessionMode.isLocked && !Main.sessionMode.isGreeter) {
                let captured = false;
                let closed = false;
                const complete = () => {
                    if (!captured || !closed)
                        return;
                    this._clearScreenshotSignals();
                    if (!this.settings?.get_boolean('edit-after-screenshot'))
                        return;
                    // GNOME 46 can finish saving after the overlay has closed;
                    // GNOME 50 waits for saving before starting its close.
                    this._screenshotSource = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        this._screenshotSource = 0;
                        this.clipboard.readImage().then(image => {
                            if (image && this._active && epoch === this._epoch && serial === this._captureSerial &&
                                this.settings.get_boolean('edit-after-screenshot'))
                                this._openEditor(image.bytes, image.mime);
                        }).catch(() => {});
                        return GLib.SOURCE_REMOVE;
                    });
                };
                this._captureSignals = [
                    Main.screenshotUI.connect('screenshot-taken', () => { captured = true; complete(); }),
                    Main.screenshotUI.connect('closed', () => {
                        closed = true;
                        if (captured) {
                            complete();
                        } else {
                            this._captureTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
                                this._captureTimeout = 0;
                                this._clearScreenshotSignals();
                                return GLib.SOURCE_REMOVE;
                            });
                        }
                    }),
                    // A cancelled capture must not adopt a later Print Screen.
                    Main.screenshotUI.connect('notify::visible', () => {
                        if (closed && Main.screenshotUI.visible)
                            this._clearScreenshotSignals();
                    }),
                ];
                Main.screenshotUI.open().catch(() => {
                    this._clearScreenshotSignals();
                    if (this._active)
                        Main.notify('Super V', _('Could not open the screenshot tool. Try Print Screen.'));
                });
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _shouldPersist() {
        return this.settings.get_boolean('remember-history') &&
            !this.settings.get_boolean('clear-on-shutdown');
    }

    _settingsChanged(key) {
        if (key === 'history-limit') {
            this.history.setLimit(this.settings.get_int(key));
            this.changed();
        } else if (key === 'remember-history' || key === 'clear-on-shutdown') {
            this._stateRevision++;
            this.store.persist = this._shouldPersist();
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
        } else if (key === 'ui-language') {
            initTranslations(this.dir, this.settings.get_string('ui-language'));
            if (this._ready)
                this._updateLanguage().catch(error => console.error(`Super V language: ${error.message}`));
        }
    }

    disable() {
        this._active = false;
        this._epoch++;
        this.editor?.close();
        this._clearScreenshotSignals();
        this._stateCancellable?.cancel();
        if (this._binding)
            Main.wm.removeKeybinding('open-popup');
        this._binding = false;
        if (this._screenshotBinding)
            Main.wm.removeKeybinding('take-screenshot');
        this._screenshotBinding = false;
        if (this._screenshotSource)
            GLib.source_remove(this._screenshotSource);
        this._screenshotSource = 0;
        if (this._sessionHandler)
            Main.sessionMode.disconnect(this._sessionHandler);
        this._sessionHandler = 0;
        this.settings?.disconnect(this._settingsHandler);
        this.clipboard?.destroy();
        this.pasteBackend?.destroy();
        this.popup?.destroy();
        if (this.emoji && this._ready)
            this._storageBarrier = this.store?.save(this.history.toJSON(this.emoji.recent), this.images?.snapshot());
        else
            this._storageBarrier = this.store?.flush();
        this.popup = this.clipboard = this.pasteBackend = this.settings = null;
        this.history = this.emoji = this.store = this.pendingRestore = this._target = this.gifs = null;
        this.images = null;
        this.editor = null;
        this._stateCancellable = null;
        this._emojiRecords = null;
    }
}
