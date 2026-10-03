// SPDX-License-Identifier: GPL-3.0-or-later
// Run only inside GNOME Shell's headless automation session, never under Node.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Pango from 'gi://Pango';
import {bindtextdomain} from 'gettext';
import {gettext as _, initTranslations} from '../extension/translations.js';
import {annotationLocale, emojiLocale} from '../extension/core/localization.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {SuperVPopup} from '../extension/popup.js';
import {EmojiIndex} from '../extension/core/emoji.js';
import {History} from '../extension/core/history.js';
import {GifLibrary} from '../extension/gifs.js';
import {getDefaultSeat} from '../extension/shell-compat.js';
import SuperVExtension from '../extension/extension.js';

export const METRICS = {};
function check(name, condition) {
    if (!condition)
        throw new Error(name);
    print(`SHELL PASS: ${name}`);
}

function rectangle(actor) {
    const [x, y] = actor.get_transformed_position();
    const [width, height] = actor.get_transformed_size();
    return {x, y, width, height};
}

export async function run() {
    await Scripting.sleep(300);
    Main.overview.hide();
    // Shell changes its working directory at startup; resolve from this module.
    const base = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_path();
    bindtextdomain('super-v-ubuntu', `${base}/extension/locale`);
    initTranslations(Gio.File.new_for_path(`${base}/extension`));
    const locale = emojiLocale(GLib.get_language_names());
    const annotations = locale === 'en' ? {} : JSON.parse(new TextDecoder().decode(
        Gio.File.new_for_path(`${base}/extension/data/emoji-locales/${locale}.json`).load_contents(null)[1])).annotations;
    const read = path => new TextDecoder().decode(Gio.File.new_for_path(`${base}/${path}`).load_contents(null)[1]);
    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(`${base}/extension/schemas`,
        Gio.SettingsSchemaSource.get_default(), false);
    const settings = new Gio.Settings({settings_schema: schemaSource.lookup(
        'org.gnome.shell.extensions.super-v-ubuntu', true)});
    const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
    const stylesheet = Gio.File.new_for_path(`${base}/extension/stylesheet.css`);
    theme.load_stylesheet(stylesheet);
    const calls = [];
    const controller = {settings, metadata: JSON.parse(read('extension/metadata.json')),
        history: new History(), emoji: new EmojiIndex(JSON.parse(read('extension/data/emoji.json')).emoji, [], annotations),
        gifs: new GifLibrary(settings), select: entry => calls.push(entry.text),
        selectGif() {}, pin() {}, deleteEntry() {}, clear() {}, restoreClipboard() {}, openPreferences() {}};
    controller.dir = Gio.File.new_for_path(`${base}/extension`);
    controller._active = true;
    controller._epoch = 1;
    controller._languageRevision = 0;
    controller._emojiRecords = JSON.parse(read('extension/data/emoji.json')).emoji;
    controller._stateCancellable = new Gio.Cancellable();
    // Exercise actual GTK/libadwaita preferences in this private Wayland session.
    const launcher = new Gio.SubprocessLauncher({
        flags: Gio.SubprocessFlags.STDERR_PIPE});
    launcher.setenv('GI_TYPELIB_PATH', `/usr/lib/gnome-shell/girepository-1.0:/usr/lib/gnome-shell:${GLib.getenv('GI_TYPELIB_PATH') ?? ''}`, true);
    launcher.setenv('LD_LIBRARY_PATH', `/usr/lib/gnome-shell:${GLib.getenv('LD_LIBRARY_PATH') ?? ''}`, true);
    const preferences = launcher.spawnv(['gjs', '-m', `${base}/tests/prefs-gjs.js`]);
    const output = await new Promise((resolve, reject) => {
        preferences.communicate_utf8_async(null, null, (process, result) => {
            try { resolve(process.communicate_utf8_finish(result)); } catch (error) { reject(error); }
        });
    });
    if (!preferences.get_successful())
        throw new Error(`Preferences check failed: ${output[2]}`);
    check('actual localized GTK preferences render', preferences.get_successful());
    const pointer = getDefaultSeat(global.stage, Clutter).create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), 900, 650);
    await Scripting.sleep(100);
    const popup = new SuperVPopup(controller);
    controller.popup = popup;
    try {
        check('popup opens', popup.showPanel());
        popup._setTab('emoji');
        await Scripting.sleep(300);
        check('loaded version is visible', popup._title.text === 'Super V 0.1.5');
        check('six equally sized emoji per row', popup._rows.length === 60 &&
            popup.list.get_first_child().get_n_children() === 6);
        const cells = popup._rows.slice(0, 7).map(rectangle);
        print(`SHELL CELLS: ${JSON.stringify(cells)}`);
        check('real St layout places six glyphs horizontally', cells.slice(0, 6).every(cell =>
            Math.abs(cell.y - cells[0].y) < 1 && Math.abs(cell.width - cells[0].width) <= 1.01) &&
            cells[5].x > cells[0].x && cells[6].y > cells[0].y);
        check('localized settings button uses the gettext catalog',
            popup.contentLayout.get_first_child().get_last_child().label === {
                en: 'Settings', zh: '设置', zh_Hant: '設定', ja: '設定',
                es: 'Ajustes', fr: 'Paramètres', ko: '설정',
            }[locale]);
        check('localized emoji names reach accessible labels', popup._rows[0].accessible_name === controller.emoji.records[0].name);
        check('emoji labels contain only glyphs', popup._rows.every((row, index) =>
            row.get_child().text === popup.results[index].text));
        const area = Main.layoutManager.getWorkAreaForMonitor(popup._monitor.index);
        const rect = rectangle(popup._panel);
        print(`SHELL GEOMETRY: ${JSON.stringify({area: {x: area.x, y: area.y,
            width: area.width, height: area.height}, pointer: popup._anchor, panel: rect,
            translation: [popup._panel.translation_x, popup._panel.translation_y]})}`);
        check('near-pointer panel stays within its work area', rect.x >= area.x && rect.y >= area.y &&
            rect.x + rect.width <= area.x + area.width + 1 && rect.y + rect.height <= area.y + area.height + 1);
        // Exercise a long translated category and both visible clipboard footer buttons.
        popup.group = 'Animals & Nature';
        popup.refresh();
        await Scripting.sleep(100);
        check('category translation keeps the Unicode filter ID', popup.group === 'Animals & Nature' &&
            popup._categoryButtons.get(popup.group).accessible_name === _('Animals & Nature'));
        const categoryCells = [...popup._categoryButtons.values()].map(rectangle);
        check('all emoji category buttons occupy one horizontal row', categoryCells.every(cell =>
            Math.abs(cell.y - categoryCells[0].y) < 1));
        const adjustment = popup._categoryScroll.get_hadjustment();
        popup._categoryForward.emit('clicked', 1);
        await Scripting.sleep(100);
        check('overflow categories can scroll horizontally', adjustment.value > 0);
        const flags = popup._categoryButtons.get('Flags');
        flags.grab_key_focus();
        await Scripting.sleep(100);
        const flagsRect = rectangle(flags);
        const viewport = rectangle(popup._categoryScroll);
        check('keyboard focus brings the final category into view', flagsRect.x >= viewport.x - 1 &&
            flagsRect.x + flagsRect.width <= viewport.x + viewport.width + 1);
        flags.emit('clicked', 1);
        await Scripting.sleep(100);
        check('direct category click filters emoji', popup.group === 'Flags' &&
            popup.results.every(record => record.group === 'Flags'));
        popup._setGroup('People & Body');
        popup._toneButton.emit('clicked', 1);
        await Scripting.sleep(100);
        check('skin tone dropdown opens', popup._toneMenu.isOpen);
        const darkTone = rectangle(popup._toneItems.get('dark'));
        pointer.notify_absolute_motion(GLib.get_monotonic_time(),
            darkTone.x + darkTone.width / 2, darkTone.y + darkTone.height / 2);
        await Scripting.sleep(80);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.PRESSED);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(100);
        check('skin tone menu selects directly', popup.tone === 'dark' &&
            popup._toneButton.accessible_name.includes(_('Dark')) &&
            popup.state === ModalDialog.State.OPENED && !popup._toneMenu.isOpen);
        popup.tone = 'all';
        popup._toneMenu.close();
        // Switch every language in the same Shell process, independent of its locale.
        controller.emoji.setRecent(['😀']);
        for (const language of ['en', 'zh_CN', 'zh_TW', 'ja', 'es', 'fr', 'ko']) {
            settings.set_string('ui-language', language);
            await SuperVExtension.prototype._updateLanguage.call(controller);
            await Scripting.sleep(60);
            check(`live popup language ${language}`, popup._settingsButton.label === {
                en: 'Settings', zh_CN: '设置', zh_TW: '設定', ja: '設定',
                es: 'Ajustes', fr: 'Paramètres', ko: '설정',
            }[language]);
            const faceName = language === 'en' ? controller._emojiRecords[0].name
                : JSON.parse(read(`extension/data/emoji-locales/${annotationLocale(language)}.json`)).annotations['😀'].name;
            check(`live emoji catalog ${language}`, controller.emoji.byText.get('😀').name === faceName &&
                controller.emoji.search('grinning face').some(record => record.text === '😀') &&
                controller.emoji.recent[0] === '😀');
        }
        settings.set_string('ui-language', 'system');
        await SuperVExtension.prototype._updateLanguage.call(controller);
        // A narrow content area and larger inherited text must retain a
        // single category row and keep its focused final button reachable.
        const context = St.ThemeContext.get_for_stage(global.stage);
        const originalFont = context.get_font();
        context.set_font(Pango.FontDescription.from_string('Sans 16'));
        popup._panel.set_style('width: 270px;');
        popup._emojiColumns = 4;
        popup.refresh();
        await Scripting.sleep(150);
        const narrowCategories = [...popup._categoryButtons.values()].map(rectangle);
        check('larger text and narrow layout retain one category row', narrowCategories.every(cell =>
            Math.abs(cell.y - narrowCategories[0].y) < 1));
        popup._categoryButtons.get('Flags').grab_key_focus();
        await Scripting.sleep(100);
        const narrowFlag = rectangle(popup._categoryButtons.get('Flags'));
        const narrowViewport = rectangle(popup._categoryScroll);
        check('narrow category bar can reveal the final button', narrowFlag.x >= narrowViewport.x - 1 &&
            narrowFlag.x + narrowFlag.width <= narrowViewport.x + narrowViewport.width + 1);
        context.set_font(originalFont);
        popup._panel.set_style('width: 390px;');
        popup._emojiColumns = 6;
        popup.refresh();
        controller.pendingRestore = {previous: 'sample', emoji: '😀'};
        popup._setTab('clipboard');
        await Scripting.sleep(100);
        const clipboardPanel = rectangle(popup._panel);
        for (const control of [popup._clear, popup._restore]) {
            const bounds = rectangle(control);
            check('translated footer stays inside panel', bounds.x >= clipboardPanel.x &&
                bounds.x + bounds.width <= clipboardPanel.x + clipboardPanel.width + 1);
        }
        controller.pendingRestore = null;
        popup._setTab('kaomoji');
        await Scripting.sleep(100);
        check('kaomoji has three columns', popup.list.get_first_child().get_n_children() === 3);
        const kaomojiCategories = [...popup._categoryButtons.values()].map(rectangle);
        check('kaomoji categories stay on one row', kaomojiCategories.every(cell =>
            Math.abs(cell.y - kaomojiCategories[0].y) < 1));
        popup._setTab('symbols');
        popup.search.set_text('plus minus');
        await Scripting.sleep(100);
        check('symbols search renders plus-minus glyph', popup._rows[0].get_child().text === '±');
        popup._activate(0);
        check('symbol activation selects its text', calls[0] === '±');
        popup._setTab('gifs');
        check('GIF empty state offers settings', popup._manageGifs.visible && popup._rows.length === 0);
        settings.set_string('popup-position', 'center');
        popup.positionPanel();
        await Scripting.sleep(100);
        const center = rectangle(popup._panel);
        const monitor = popup._monitor;
        check('center setting clears pointer translation', popup._panel.translation_x === 0 &&
            Math.abs(center.x + center.width / 2 - monitor.x - monitor.width / 2) < 2);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), center.x + 80, center.y + 72);
        await Scripting.sleep(100);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.PRESSED);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(100);
        check('actual inside mouse click keeps the modal open', popup.state === ModalDialog.State.OPENED);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), 5, 100);
        await Scripting.sleep(100);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.PRESSED);
        pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(150);
        check('actual outside mouse click closes the modal', popup.state === ModalDialog.State.CLOSED);
        const screenshot = GLib.getenv('SUPER_V_SCREENSHOT');
        if (screenshot) {
            popup.showPanel();
            popup._setTab('emoji');
            await Scripting.sleep(200);
            const frame = rectangle(popup._panel);
            const output = Gio.File.new_for_path(screenshot).replace(null, false,
                Gio.FileCreateFlags.PRIVATE, null);
            await new Shell.Screenshot().screenshot_area(Math.floor(frame.x), Math.floor(frame.y),
                Math.ceil(frame.width), Math.ceil(frame.height), output);
            output.close(null);
        }
        print('SHELL CHECKS COMPLETE');
    } finally {
        popup.destroy();
        theme.unload_stylesheet(stylesheet);
    }
}
