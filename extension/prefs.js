// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {parsePasteOverrides, validateAppList} from './core/settings.js';
import {gifPaths, MAX_GIF_FILES} from './core/gif.js';
import {GifLibrary} from './gifs.js';

export default class SuperVPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(680, 720);
        const page = new Adw.PreferencesPage({title: 'Super V', icon_name: 'edit-paste-symbolic'});
        window.add(page);
        const history = new Adw.PreferencesGroup({title: 'Clipboard history',
            description: 'History stays on this computer. It may contain private text. Pausing capture does not erase existing entries.'});
        page.add(history);
        for (const [key, title, subtitle] of [
            ['history-enabled', 'Capture clipboard history', 'Text copied after enabling the extension is collected.'],
            ['remember-history', 'Remember after logout', 'Turning this off removes the saved file; current memory is retained.'],
            ['auto-paste', 'Paste automatically', 'Turn off to copy selections without sending a paste shortcut.'],
        ]) {
            const row = new Adw.SwitchRow({title, subtitle});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            history.add(row);
        }
        const limit = Adw.SpinRow.new_with_range(1, 500, 1);
        limit.title = 'Maximum unpinned entries';
        limit.subtitle = 'Pinned entries have a separate maximum of 100. Total text is limited to 2 MiB.';
        settings.bind('history-limit', limit, 'value', Gio.SettingsBindFlags.DEFAULT);
        history.add(limit);
        for (const [prefix, title, subtitle] of [
            ['ordinary', 'Clear unpinned history', 'Pinned entries are kept.'],
            ['all', 'Erase all saved items', 'Also removes pinned entries and emoji recents.'],
        ]) {
            const row = new Adw.ActionRow({title, subtitle});
            const clear = new Gtk.Button({label: 'Clear', valign: Gtk.Align.CENTER});
            clear.add_css_class('destructive-action');
            clear.connect('clicked', () => {
                settings.set_string('clear-request', `${prefix}:${GLib.uuid_string_random()}`);
                window.add_toast(new Adw.Toast({title: 'Clear requested; applied when the extension is active.'}));
            });
            row.add_suffix(clear);
            history.add(row);
        }
        const integration = new Adw.PreferencesGroup({title: 'Desktop integration',
            description: 'Use exact desktop application IDs (including .desktop where present) or WM classes. Clipboard origin cannot always be identified.'});
        page.add(integration);
        const position = new Adw.ComboRow({title: 'Picker position',
            subtitle: 'Super+V opens near the mouse pointer, or in the center of the focused screen.',
            model: Gtk.StringList.new(['Near mouse pointer', 'Center of screen']),
            selected: settings.get_string('popup-position') === 'center' ? 1 : 0});
        position.connect('notify::selected', () =>
            settings.set_string('popup-position', position.selected === 1 ? 'center' : 'pointer'));
        integration.add(position);
        const shortcut = new Adw.EntryRow({title: 'Shortcut (GTK accelerator syntax)',
            text: settings.get_strv('open-popup')[0] ?? '', show_apply_button: true});
        shortcut.connect('apply', () => {
            const [valid, key, modifiers] = Gtk.accelerator_parse(shortcut.text);
            if (valid && Gtk.accelerator_valid(key, modifiers) && modifiers !== 0) {
                settings.set_strv('open-popup', [Gtk.accelerator_name(key, modifiers)]);
                shortcut.remove_css_class('error');
            } else {
                shortcut.add_css_class('error');
                window.add_toast(new Adw.Toast({title: 'Use a shortcut such as <Super>v or <Control><Alt>v.'}));
            }
        });
        integration.add(shortcut);
        for (const [key, title] of [['excluded-apps', 'Excluded apps (comma-separated)'],
            ['terminal-apps', 'Apps using Ctrl+Shift+V (comma-separated)']]) {
            const row = new Adw.EntryRow({title, text: settings.get_strv(key).join(', '),
                show_apply_button: true});
            row.connect('apply', () => settings.set_strv(key, validateAppList(row.text.split(','))));
            integration.add(row);
        }
        const overrides = new Adw.EntryRow({title: 'Paste overrides (JSON)',
            text: settings.get_string('paste-overrides'), show_apply_button: true});
        overrides.connect('apply', () => {
            try {
                const parsed = JSON.parse(overrides.text);
                const clean = parsePasteOverrides(overrides.text);
                if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' ||
                    Object.keys(parsed).length !== Object.keys(clean).length)
                    throw new Error('Invalid overrides');
                settings.set_string('paste-overrides', JSON.stringify(clean));
                overrides.remove_css_class('error');
            } catch {
                overrides.add_css_class('error');
                window.add_toast(new Adw.Toast({title: 'Shortcuts: ctrl-v, ctrl-shift-v, shift-insert, manual.'}));
            }
        });
        integration.add(overrides);
        const gifs = new Adw.PreferencesGroup({title: 'GIF favorites',
            description: 'Add local GIF files (up to 40, 8 MiB each, 2048 × 2048 pixels). The picker shows the first frame and copies the GIF image. Pasting requires an app that accepts images; animation support depends on the app. Files stay in their original location. No online search.'});
        page.add(gifs);
        const addRow = new Adw.ActionRow({title: 'Add GIF files'});
        const add = new Gtk.Button({label: 'Choose files', valign: Gtk.Align.CENTER});
        const library = new GifLibrary(settings);
        add.connect('clicked', () => {
            const filter = new Gtk.FileFilter({name: 'GIF images'});
            filter.add_mime_type('image/gif');
            filter.add_pattern('*.gif');
            filter.add_pattern('*.GIF');
            const filters = new Gio.ListStore({item_type: Gtk.FileFilter});
            filters.append(filter);
            const dialog = new Gtk.FileDialog({title: 'Add GIF favorites', filters, default_filter: filter});
            dialog.open_multiple(window, null, async (source, result) => {
                let files;
                try {
                    files = source.open_multiple_finish(result);
                } catch {
                    return; // File chooser dismissal leaves favorites unchanged.
                }
                add.sensitive = false;
                let skipped = 0;
                try {
                    for (let index = 0; index < files.get_n_items(); index++) {
                        const path = files.get_item(index).get_path();
                        const current = gifPaths(settings.get_strv('gif-files'));
                        if (current.includes(path))
                            continue;
                        if (!gifPaths([path]).length || current.length >= MAX_GIF_FILES) {
                            skipped++;
                            continue;
                        }
                        try {
                            await library.read({path});
                            settings.set_strv('gif-files', gifPaths([...settings.get_strv('gif-files'), path]));
                        } catch {
                            skipped++;
                        }
                    }
                    if (skipped)
                        window.add_toast(new Adw.Toast({title: `${skipped} file(s) skipped: invalid, too large, or favorites full.`}));
                } finally {
                    add.sensitive = true;
                }
            });
        });
        addRow.add_suffix(add);
        gifs.add(addRow);
        let favoriteRows = [];
        const refreshGifs = () => {
            for (const row of favoriteRows)
                gifs.remove(row);
            favoriteRows = [];
            for (const path of gifPaths(settings.get_strv('gif-files'))) {
                const row = new Adw.ActionRow({title: GLib.path_get_basename(path), subtitle: path});
                const remove = new Gtk.Button({icon_name: 'list-remove-symbolic',
                    tooltip_text: 'Remove favorite (keep file)', valign: Gtk.Align.CENTER});
                remove.connect('clicked', () =>
                    settings.set_strv('gif-files', settings.get_strv('gif-files').filter(value => value !== path)));
                row.add_suffix(remove);
                gifs.add(row);
                favoriteRows.push(row);
            }
        };
        const gifSignal = settings.connect('changed::gif-files', refreshGifs);
        window.connect('close-request', () => {
            settings.disconnect(gifSignal);
            return false;
        });
        refreshGifs();
        const privacy = new Adw.PreferencesGroup({title: 'Local storage',
            description: `Plaintext history: ${GLib.build_filenamev([GLib.get_user_state_dir(), 'super-v-ubuntu', 'history.json'])}. Directory 0700; file 0600. Password-manager MIME hints and focused-app exclusions are best effort. No telemetry or runtime network access.`});
        page.add(privacy);
    }
}
