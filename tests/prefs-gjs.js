// SPDX-License-Identifier: GPL-3.0-or-later
// Launched inside the isolated compositor; never uses the user's desktop.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import System from 'system';
import {resolveLanguage, languageOptions} from '../extension/core/localization.js';

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
const settings = prefs.getSettings();
const loop = new GLib.MainLoop(null, false);
let status = 0;
const expected = {en: 'Clipboard history', zh_CN: '剪贴板历史', zh_TW: '剪貼簿歷史',
    ja: 'クリップボード履歴', es: 'Historial del portapapeles',
    fr: 'Historique du presse-papiers', ko: '클립보드 기록'};
function verify(language) {
    const groups = [];
    let selector;
    const visit = widget => {
        if (widget instanceof Adw.PreferencesGroup)
            groups.push(widget.title);
        if (widget instanceof Adw.ComboRow && widget.model.get_n_items() === 8)
            selector = widget;
        for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
            visit(child);
    };
    visit(window);
    if (!groups.includes(expected[language]))
        throw new Error(`${language}: localized preferences group missing`);
    if (!selector || window.get_width() < 600)
        throw new Error('Language selector did not render');
    for (let index = 1; index < languageOptions.length; index++) {
        if (selector.model.get_string(index) !== languageOptions[index].label)
            throw new Error('Language names must stay in their native form');
    }
    return selector;
}
const systemLanguage = resolveLanguage('system', GLib.get_language_names());
let step = 0;
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
    try {
        const current = step === 0 || step === 8 ? systemLanguage : languageOptions[step].id;
        const selector = verify(current);
        if (step === 8) {
            print(`PREFS CHECKS COMPLETE: ${GLib.getenv('LANGUAGE')} + seven live choices`);
        } else {
            if (step > 0 && (settings.get_string('ui-language') !== current || selector.selected !== step))
                throw new Error('Language choice was not saved after refreshing');
            const next = step === 7 ? 0 : step + 1;
            print(`PREFS: selecting ${languageOptions[next].id}`);
            selector.selected = next;
            step++;
            return GLib.SOURCE_CONTINUE;
        }
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
