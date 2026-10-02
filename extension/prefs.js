// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {parsePasteOverrides, validateAppList} from './core/settings.js';

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
        const privacy = new Adw.PreferencesGroup({title: 'Local storage',
            description: `Plaintext history: ${GLib.build_filenamev([GLib.get_user_state_dir(), 'super-v-ubuntu', 'history.json'])}. Directory 0700; file 0600. Password-manager MIME hints and focused-app exclusions are best effort. No telemetry or runtime network access.`});
        page.add(privacy);
    }
}
