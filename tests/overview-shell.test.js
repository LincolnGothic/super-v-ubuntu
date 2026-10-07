// SPDX-License-Identifier: GPL-3.0-or-later
// Run only in a fresh, disposable GNOME Shell Wayland automation session.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {getDefaultSeat} from '../extension/shell-compat.js';
import SuperVExtension from '../extension/extension.js';

export const METRICS = {};
export function init() {
    // GNOME 50 can complete startup before the automation module is imported.
    if (!Main.layoutManager._startingUp) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            Scripting.runPerfScript({run, METRICS}, GLib.getenv('SHELL_PERF_OUTPUT'));
            return GLib.SOURCE_REMOVE;
        });
    }
    new Gio.Settings({schema_id: 'org.gnome.desktop.interface'}).set_boolean('enable-animations', false);
}

function check(name, condition) {
    if (!condition) throw new Error(name);
    print(`SHELL PASS: ${name}`);
}

export async function run() {
    await Scripting.sleep(500);
    const seat = getDefaultSeat(global.stage, Clutter);
    const keyboard = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
    const pointer = seat.create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
    keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
    await Scripting.sleep(100);
    Main.overview.hide();
    await Scripting.sleep(500);
    // Allocate Overview before GNOME lazily populates the application grid.
    Main.overview.show();
    await Scripting.sleep(500);
    Main.overview.hide();
    await Scripting.sleep(500);
    Main.overview.showApps();
    await Scripting.sleep(1000);
    Main.overview.hide();
    await Scripting.sleep(300);
    const base = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_path();
    const dir = Gio.File.new_for_path(`${base}/extension`);
    const metadata = JSON.parse(new TextDecoder().decode(dir.get_child('metadata.json').load_contents(null)[1]));
    const waitFor = async condition => {
        for (let attempt = 0; attempt < 60; attempt++) {
            if (condition()) return;
            await Scripting.sleep(50);
        }
        throw new Error('Overview screenshot wait timed out');
    };
    const extension = new SuperVExtension({...metadata, dir, path: dir.get_path()});
    try {
        extension.enable();
        await waitFor(() => extension._ready);
        const overviewAutoEdit = extension.settings.get_boolean('edit-after-screenshot');
        extension.settings.set_boolean('edit-after-screenshot', false);
        const pressScreenshot = () => {
            for (const key of [Clutter.KEY_Super_L, Clutter.KEY_Shift_L, Clutter.KEY_s])
                keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.PRESSED);
            for (const key of [Clutter.KEY_s, Clutter.KEY_Shift_L, Clutter.KEY_Super_L])
                keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.RELEASED);
        };
        for (const showApps of [true, false]) {
            const view = showApps ? 'Show Apps' : 'Activities';
            if (showApps) Main.overview.showApps();
            else Main.overview.show();
            await waitFor(() => Main.overview.visible && !Main.overview.animationInProgress);
            // Let deferred app icons load and the first frame allocate before taking focus.
            await Scripting.sleep(300);
            check(`${view} uses Overview input mode`, Main.actionMode === Shell.ActionMode.OVERVIEW);
            if (showApps) check('Show Apps displays the application grid', Main.overview.dash.showAppsButton.checked);
            const search = Main.overview.searchEntry.clutter_text;
            search.grab_key_focus();
            const searchBefore = search.get_text();
            const countBefore = extension.history.entries.length;
            pressScreenshot();
            await waitFor(() => extension._areaCapture?.visible);
            check(`Super+Shift+S opens frozen selection over ${view}`, Main.overview.visible &&
                !!extension._areaCapture.get_content() && !extension._areaCapture._rubberband.visible &&
                search.get_text() === searchBefore);
            keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Escape, Clutter.KeyState.PRESSED);
            keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Escape, Clutter.KeyState.RELEASED);
            await waitFor(() => !extension._areaCapture);
            check(`Escape restores ${view} without changing history or search`, Main.overview.visible &&
                Main.actionMode === Shell.ActionMode.OVERVIEW && search.get_text() === searchBefore &&
                extension.history.entries.length === countBefore);
            pressScreenshot();
            await waitFor(() => extension._areaCapture?.visible);
            pointer.notify_absolute_motion(GLib.get_monotonic_time(), 200, 200);
            await Scripting.sleep(50);
            pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.PRESSED);
            await Scripting.sleep(50);
            pointer.notify_absolute_motion(GLib.get_monotonic_time(), 280, 260);
            await Scripting.sleep(50);
            pointer.notify_button(GLib.get_monotonic_time(), 1, Clutter.ButtonState.RELEASED);
            await waitFor(() => !extension._areaCapture && extension.history.entries.length > countBefore);
            const captured = extension.history.entries[0];
            check(`${view} screenshot reaches history and clipboard`, captured.mime === 'image/png' &&
                captured.width === 81 && captured.height === 61 &&
                (await extension.clipboard.readImage())?.mime === 'image/png');
            extension.deleteEntry(captured.id);
            Main.overview.hide();
            await waitFor(() => !Main.overview.visible);
        }
        extension.settings.set_boolean('edit-after-screenshot', overviewAutoEdit);
        print('SHELL CHECKS COMPLETE');
    } finally {
        extension.disable();
        Main.overview.hide();
    }
}
