// SPDX-License-Identifier: GPL-3.0-or-later
// Run only inside GNOME Shell's headless automation session, never under Node.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {SuperVPopup} from '../extension/popup.js';
import {EmojiIndex} from '../extension/core/emoji.js';
import {History} from '../extension/core/history.js';
import {GifLibrary} from '../extension/gifs.js';
import {getDefaultSeat} from '../extension/shell-compat.js';

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
    const base = GLib.get_current_dir();
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
        history: new History(), emoji: new EmojiIndex(JSON.parse(read('extension/data/emoji.json')).emoji),
        gifs: new GifLibrary(settings), select: entry => calls.push(entry.text),
        selectGif() {}, pin() {}, deleteEntry() {}, clear() {}, restoreClipboard() {}, openPreferences() {}};
    const pointer = getDefaultSeat(global.stage, Clutter).create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), 900, 650);
    await Scripting.sleep(100);
    const popup = new SuperVPopup(controller);
    try {
        check('popup opens', popup.showPanel());
        popup._setTab('emoji');
        await Scripting.sleep(300);
        check('loaded version is visible', popup._title.text === 'Super V 0.1.3');
        check('six equally sized emoji per row', popup._rows.length === 60 &&
            popup.list.get_first_child().get_n_children() === 6);
        const cells = popup._rows.slice(0, 7).map(rectangle);
        check('real St layout places six glyphs horizontally', cells.slice(0, 6).every(cell =>
            Math.abs(cell.y - cells[0].y) < 1 && Math.abs(cell.width - cells[0].width) < 1) &&
            cells[5].x > cells[0].x && cells[6].y > cells[0].y);
        check('emoji labels contain only glyphs', popup._rows.every((row, index) =>
            row.get_child().text === popup.results[index].text));
        const area = Main.layoutManager.getWorkAreaForMonitor(popup._monitor.index);
        const rect = rectangle(popup.dialogLayout);
        check('near-pointer panel stays within its work area', rect.x >= area.x && rect.y >= area.y &&
            rect.x + rect.width <= area.x + area.width + 1 && rect.y + rect.height <= area.y + area.height + 1);
        print(`SHELL GEOMETRY: ${JSON.stringify({area, pointer: popup._anchor, panel: rect})}`);
        popup._setTab('kaomoji');
        await Scripting.sleep(100);
        check('kaomoji has three columns', popup.list.get_first_child().get_n_children() === 3);
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
        const center = rectangle(popup.dialogLayout);
        const monitor = popup._monitor;
        check('center setting clears pointer translation', popup.dialogLayout.translation_x === 0 &&
            Math.abs(center.x + center.width / 2 - monitor.x - monitor.width / 2) < 2);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), 5, 100);
        await Scripting.sleep(100);
        pointer.notify_button(GLib.get_monotonic_time(), 0x110, Clutter.ButtonState.PRESSED);
        pointer.notify_button(GLib.get_monotonic_time(), 0x110, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(150);
        check('actual outside mouse click closes the modal', popup.state === ModalDialog.State.CLOSED);
        print('SHELL CHECKS COMPLETE');
    } finally {
        popup.destroy();
        theme.unload_stylesheet(stylesheet);
    }
}
