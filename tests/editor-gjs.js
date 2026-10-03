// SPDX-License-Identifier: GPL-3.0-or-later
// Runs only in the disposable Wayland test session.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import System from 'system';
import {ImageEditor} from '../extension/editor.js';
import {decodeImage, exportPng} from '../extension/editor-render.js';
import {gettext as _} from '../extension/translations.js';
Adw.init();
const base = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const fixtures = JSON.parse(new TextDecoder().decode(base.get_child('tests').get_child('fixtures')
    .get_child('images.json').load_contents(null)[1]));
let checks = 0;
function check(condition, message) {
    if (!condition)
        throw new Error(message);
    checks++;
}
function pixel(pixbuf, x, y) {
    const bytes = pixbuf.get_pixels();
    const offset = y * pixbuf.rowstride + x * pixbuf.n_channels;
    return [...bytes.slice(offset, offset + 3)];
}
const loop = new GLib.MainLoop(null, false);
let status = 0;
const editor = new ImageEditor(GLib.base64_decode(fixtures.png), 'image/png', null, bytes => {
    const output = decodeImage(bytes, 'image/png');
    check(output.width === 40 && output.height === 30, 'Copy did not export the crop');
});
editor.window.present();
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
    (async () => {
        check(editor.window.title === _('Screenshot editor'), 'Editor is not localized');
        check(editor.canvas.get_width() > 200 && editor.canvas.get_height() > 200, 'Editor canvas did not render');
        for (const type of ['arrow', 'rectangle', 'highlight', 'pen', 'text']) {
            editor.document.add({type, x: 2, y: 2, x2: 20, y2: 18, color: '#ff0000', width: 4,
                text: '你好 日本語 한국어', points: [[3, 4], [6, 8]]});
            check(exportPng(editor.pixbuf, editor.document.state).length > 0, `${type} did not render`);
        }
        editor.document.add({type: 'redact', x: 5, y: 5, x2: 25, y2: 25, color: '#ffffff', width: 4});
        const covered = decodeImage(exportPng(editor.pixbuf, editor.document.state), 'image/png');
        check(pixel(covered, 10, 10).every(value => value === 0), 'Redaction was not opaque black');
        editor.document.crop([0, 0], [40, 30]);
        editor._update();
        await editor.copy();
        const destination = Gio.File.new_for_path(`${GLib.getenv('XDG_STATE_HOME')}/explicit-export.png`);
        await editor.saveTo(destination);
        const saved = decodeImage(destination.load_contents(null)[1], 'image/png');
        check(saved.width === 40 && saved.height === 30 && pixel(saved, 10, 10).every(value => value === 0), 'Saved PNG lost crop/redaction');
        check(destination.query_info('unix::mode', Gio.FileQueryInfoFlags.NONE, null).get_attribute_uint32('unix::mode') % 512 === 384, 'Saved export is not private');
        destination.delete(null);
        check(editor.undoButton.sensitive, 'Undo action is unavailable');
        editor.undoButton.emit('clicked');
        check(editor.document.state.crop.width === 64 && editor.redoButton.sensitive, 'Undo failed');
        editor.redoButton.emit('clicked');
        check(editor.document.state.crop.width === 40, 'Redo failed');
        for (const tool of editor.toolButtons.keys()) {
            editor.toolButtons.get(tool).emit('clicked');
            check(editor.tool === tool && editor.toolButtons.get(tool).active, 'Toolbar selection failed');
        }
        const jpeg = decodeImage(GLib.base64_decode(fixtures.jpeg), 'image/jpeg');
        check(jpeg.width === 64 && jpeg.height === 48, 'JPEG input failed');
        const dialog = new Gtk.FileChooserNative({transient_for: editor.window, action: Gtk.FileChooserAction.SAVE});
        dialog.destroy();
        check(!base.get_child('extension').get_child('editor.png').query_exists(null), 'Editor created a scratch image');
        print(`EDITOR CHECKS COMPLETE: ${checks} checks, ${GLib.getenv('LANGUAGE')}`);
    })().catch(error => { printerr(error.stack); status = 1; }).finally(() => {
        editor.window.close();
        loop.quit();
    });
    return GLib.SOURCE_REMOVE;
});
loop.run();
System.exit(status);
