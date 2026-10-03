// SPDX-License-Identifier: GPL-3.0-or-later
// Runs only in the disposable Wayland test session.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import {runProcess} from '../extension/process.js';
import {EditorDocument} from '../extension/core/editor.js';
import {LineFrames} from '../extension/core/frames.js';
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
        editor.document = new EditorDocument(64, 48);
        const first = editor.document.add({type: 'rectangle', x: 5, y: 5, x2: 18, y2: 16, color: '#ff0000', width: 2});
        const later = editor.document.add({type: 'number', x: 40, y: 30, x2: 40, y2: 30, color: '#e01b24', width: 12});
        editor.setTool('select');
        const t = editor._transform();
        editor._begin(t.x + 10 * t.scale, t.y + 10 * t.scale);
        editor._end(5 * t.scale, 3 * t.scale);
        check(editor.selected === first && editor.document.state.annotations[0].x === 10,
            'Select gesture did not move its mark');
        check(editor.document.state.annotations[1].id === later && editor.document.state.annotations[1].x === 40,
            'Moving a mark changed a later annotation');
        editor._begin(t.x + 23 * t.scale, t.y + 19 * t.scale);
        editor._end(4 * t.scale, 4 * t.scale);
        check(editor.document.state.annotations[0].x2 === 27, 'Resize handle did not resize');
        editor.deleteButton.emit('clicked');
        check(editor.document.state.annotations.length === 1 && editor.document.state.annotations[0].number === 1,
            'Deleting a selected mark removed another mark');
        editor.undoButton.emit('clicked');
        check(editor.document.state.annotations.length === 2, 'Annotation delete was not undoable');
        const marker = decodeImage(exportPng(editor.pixbuf, editor.document.state), 'image/png');
        check(pixel(marker, 40, 25).some(value => value > 0), 'Numbered marker was not rendered');
        let pinned;
        editor.onPin = bytes => { pinned = decodeImage(bytes, 'image/png'); };
        await editor.pin();
        check(pinned?.width === 64, 'Pin action did not export annotations');
        const frames = new LineFrames(100);
        check(frames.push(new Uint8Array([0xe4])).length === 0 &&
            frames.push(new Uint8Array([0xbd, 0xa0, 10]))[0] === '你', 'Native Unicode framing failed');
        const input = new Uint8Array(32768).map((_, i) => i % 251);
        const echoed = await runProcess(['/usr/bin/cat'], input);
        check(echoed.length === input.length && echoed.every((v, i) => v === input[i]), 'Native pipe transfer corrupted bytes');
        for (const options of [{timeoutMs: 20}, {cancel: new Gio.Cancellable()}]) {
            if (options.cancel) GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, () => { options.cancel.cancel(); return GLib.SOURCE_REMOVE; });
            let rejected = false;
            try { await runProcess(['/usr/bin/sleep', '2'], null, options); } catch { rejected = true; }
            check(rejected, 'OCR subprocess did not stop on timeout/cancel');
        }
        let bounded = false;
        try { await runProcess(['/usr/bin/head', '-c', '2000', '/dev/zero'], null, {outputLimit: 100}); } catch { bounded = true; }
        check(bounded, 'OCR output limit did not stop the subprocess');
        const white = GdkPixbuf.Pixbuf.new(GdkPixbuf.Colorspace.RGB, false, 8, 640, 140);
        white.fill(0xffffffff);
        const textDocument = new EditorDocument(640, 140);
        textDocument.add({type: 'text', x: 20, y: 75, x2: 20, y2: 75, color: '#000000', width: 38,
            text: 'SUPER V LOCAL OCR'});
        let copiedText = '';
        const ocrEditor = new ImageEditor(exportPng(white, textDocument.state), 'image/png', null, () => {},
            {onText: text => { copiedText = text; }});
        try {
            ocrEditor.window.present();
            check((await ocrEditor.ocr.languages(null)).includes('eng'), 'English OCR pack is missing');
            await ocrEditor.recognizeText();
            check(ocrEditor.ocrCopy.sensitive, `Local OCR failed: ${ocrEditor.ocrStatus.label}`);
            ocrEditor.ocrCopy.emit('clicked');
            check(copiedText.includes('SUPER V LOCAL OCR'), 'OCR did not recognize and copy synthetic text');
            const installed = await ocrEditor.ocr.languages(null);
            for (const [language, text, expected] of [
                ['chi_sim', '简体中文 文字识别', '简体中文'], ['chi_tra', '繁體中文 文字辨識', '繁體中文'],
                ['jpn', '日本語 テキスト', '日本語'], ['kor', '한국어 텍스트', '한국어'],
                ['spa', 'Texto español', 'español'], ['fra', 'Texte français', 'français'],
            ]) {
                if (!installed.includes(language)) continue;
                const sample = new EditorDocument(640, 140);
                sample.add({type: 'text', x: 20, y: 60, x2: 20, y2: 60, color: '#000000', width: 48, text});
                const result = await ocrEditor.ocr.recognize(exportPng(white, sample.state), language, installed, null);
                check(result.replace(/\s/gu, '').includes(expected), `${language}: synthetic recognition failed (${result})`);
            }
            ocrEditor.ocrDialog.close();
            check(!ocrEditor.ocrDialog && ocrEditor.ocrCancel.is_cancelled(), 'Closing OCR did not cancel work');
        } finally { ocrEditor.window.close(); }
        const jpeg = decodeImage(GLib.base64_decode(fixtures.jpeg), 'image/jpeg');
        check(jpeg.width === 64 && jpeg.height === 48, 'JPEG input failed');
        const dialog = new Gtk.FileChooserNative({transient_for: editor.window, action: Gtk.FileChooserAction.SAVE});
        dialog.destroy();
        check(!base.get_child('extension').get_child('editor.png').query_exists(null), 'Editor created a scratch image');
        print(`EDITOR CHECKS COMPLETE: ${checks} checks, ${GLib.getenv('LANGUAGE')}`);
    })().catch(error => { printerr(error.message, error.stack); status = 1; }).finally(() => {
        editor.window.close();
        loop.quit();
    });
    return GLib.SOURCE_REMOVE;
});
loop.run();
System.exit(status);
