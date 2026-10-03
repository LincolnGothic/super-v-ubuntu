// SPDX-License-Identifier: GPL-3.0-or-later
// Launched inside the isolated compositor; never uses the user's desktop.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import System from 'system';

Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'));
Adw.init();
const base = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const file = base.get_child('extension').get_child('metadata.json');
const metadata = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));
metadata.dir = file.get_parent();
metadata.path = metadata.dir.get_path();
const {default: Preferences} = await import('../extension/prefs.js');
const prefs = new Preferences(metadata);
const window = new Adw.PreferencesWindow();
prefs.fillPreferencesWindow(window);
window.present();
const loop = new GLib.MainLoop(null, false);
let status = 0;
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
    try {
        const text = [];
        const visit = widget => {
            if (widget instanceof Adw.PreferencesGroup)
                text.push(widget.title);
            if (widget instanceof Gtk.Label)
                text.push(widget.label);
            for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
                visit(child);
        };
        visit(window);
        const expected = {en: 'Clipboard history', zh_CN: '剪贴板历史', zh_TW: '剪貼簿歷史',
            ja: 'クリップボード履歴', es: 'Historial del portapapeles',
            fr: 'Historique du presse-papiers', ko: '클립보드 기록'}[GLib.getenv('LANGUAGE')];
        if (!text.includes(expected))
            throw new Error('Localized preferences group missing');
        if (window.get_width() < 600)
            throw new Error('Preferences window did not render');
        print(`PREFS CHECKS COMPLETE: ${GLib.getenv('LANGUAGE')}`);
    } catch (error) {
        printerr(error.stack);
        status = 1;
    }
    window.close();
    loop.quit();
    return GLib.SOURCE_REMOVE;
});
loop.run();
System.exit(status);
