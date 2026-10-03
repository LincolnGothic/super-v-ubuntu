// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';
import GLib from 'gi://GLib';
import System from 'system';
import {gettext as _, initTranslations} from './translations.js';
import {format} from './core/localization.js';
import {EditorDocument, imageTransform, imagePoint} from './core/editor.js';
import {MAX_IMAGE_BYTES} from './core/image.js';
import {decodeImage, drawDocument, exportPng} from './editor-render.js';

export const directory = Gio.File.new_for_uri(import.meta.url).get_parent();

export class ImageEditor {
    constructor(bytes, mime, application = null, onCopy = () => {}) {
        this.cancel = new Gio.Cancellable();
        const source = Gio.SettingsSchemaSource.new_from_directory(directory.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(), false);
        this.settings = new Gio.Settings({settings_schema: source.lookup('org.gnome.shell.extensions.super-v-ubuntu', true)});
        initTranslations(directory, this.settings.get_string('ui-language'));
        this.pixbuf = decodeImage(bytes, mime);
        this.document = new EditorDocument(this.pixbuf.width, this.pixbuf.height);
        this.onCopy = onCopy;
        this.tool = 'move';
        this.pan = [0, 0];
        this.labels = [];
        this.window = new Adw.ApplicationWindow({application, default_width: 1000, default_height: 740});
        this.overlay = new Adw.ToastOverlay();
        const root = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 8});
        this.overlay.set_child(root);
        this.window.set_content(this.overlay);
        const header = new Adw.HeaderBar();
        root.append(header);
        const action = (message, callback, icon = null) => {
            const button = new Gtk.Button(icon ? {icon_name: icon} : {label: _(message)});
            button.set_tooltip_text(_(message));
            button.connect('clicked', callback);
            this.labels.push({widget: button, message, icon});
            return button;
        };
        this.undoButton = action('Undo', () => { this.document.undo(); this._update(); }, 'edit-undo-symbolic');
        this.redoButton = action('Redo', () => { this.document.redo(); this._update(); }, 'edit-redo-symbolic');
        header.pack_start(this.undoButton);
        header.pack_start(this.redoButton);
        this.copyButton = action('Copy image', () => this.copy());
        this.saveButton = action('Save image', () => this.save());
        header.pack_end(this.saveButton);
        header.pack_end(this.copyButton);
        const toolbar = new Gtk.FlowBox({selection_mode: Gtk.SelectionMode.NONE,
            max_children_per_line: 8, min_children_per_line: 4, column_spacing: 4, row_spacing: 4,
            margin_start: 12, margin_end: 12});
        root.append(toolbar);
        this.toolButtons = new Map();
        for (const [tool, message] of [['move', _('Move image')], ['crop', _('Crop')],
            ['arrow', _('Arrow')], ['rectangle', _('Rectangle')], ['text', _('Text')],
            ['highlight', _('Highlight')], ['pen', _('Pen')], ['redact', _('Cover sensitive area')]]) {
            const button = new Gtk.ToggleButton({label: message});
            button.connect('clicked', () => this.setTool(tool));
            toolbar.insert(button, -1);
            this.toolButtons.set(tool, button);
        }
        const options = new Gtk.Box({spacing: 8, margin_start: 12, margin_end: 12});
        root.append(options);
        this.color = new Gtk.ColorButton({use_alpha: false});
        const red = new Gdk.RGBA();
        red.parse('#e01b24');
        this.color.set_rgba(red);
        this.color.set_tooltip_text(_('Color'));
        options.append(this.color);
        this.size = Gtk.SpinButton.new_with_range(1, 72, 1);
        this.size.value = 4;
        this.size.set_tooltip_text(_('Stroke width / text size'));
        options.append(this.size);
        this.text = new Gtk.Entry({hexpand: true, max_length: 500, placeholder_text: _('Text to add')});
        options.append(this.text);
        this.zoom = Gtk.SpinButton.new_with_range(25, 400, 25);
        this.zoom.value = 100;
        this.zoom.set_tooltip_text(_('Zoom (%)'));
        this.zoom.connect('value-changed', () => this.canvas.queue_draw());
        options.append(this.zoom);
        this.canvas = new Gtk.DrawingArea({hexpand: true, vexpand: true,
            content_width: 300, content_height: 200, focusable: true});
        root.append(this.canvas);
        this.canvas.set_draw_func((_area, cr, width, height) => {
            if (!this.pixbuf)
                return;
            cr.setSourceRGB(0.15, 0.15, 0.15);
            cr.paint();
            const t = this._transform(width, height);
            cr.save();
            cr.translate(t.x, t.y);
            cr.scale(t.scale, t.scale);
            drawDocument(cr, this.pixbuf, this.document.state, this.preview);
            cr.restore();
        });
        const drag = new Gtk.GestureDrag({button: 1});
        drag.connect('drag-begin', (_gesture, x, y) => this._begin(x, y));
        drag.connect('drag-update', (_gesture, x, y) => this._drag(x, y));
        drag.connect('drag-end', (_gesture, x, y) => this._end(x, y));
        drag.connect('cancel', () => { this.start = null; this.preview = null; this.canvas.queue_draw(); });
        this.canvas.add_controller(drag);
        this.dimensions = new Gtk.Label({margin_bottom: 8});
        root.append(this.dimensions);
        const keys = new Gtk.EventControllerKey({propagation_phase: Gtk.PropagationPhase.CAPTURE});
        keys.connect('key-pressed', (_controller, key, _code, modifiers) => {
            const editingText = this.window.get_focus()?.is_ancestor(this.text) || this.text.has_focus;
            if (modifiers & Gdk.ModifierType.CONTROL_MASK) {
                if (!editingText && [Gdk.KEY_z, Gdk.KEY_Z].includes(key)) {
                    if (modifiers & Gdk.ModifierType.SHIFT_MASK)
                        this.document.redo();
                    else
                        this.document.undo();
                    this._update();
                    return true;
                }
                if (!editingText && [Gdk.KEY_c, Gdk.KEY_C].includes(key)) { this.copy(); return true; }
                if ([Gdk.KEY_s, Gdk.KEY_S].includes(key)) { this.save(); return true; }
            }
            if (key === Gdk.KEY_Escape) { this.window.close(); return true; }
            return false;
        });
        this.window.add_controller(keys);
        this._languageHandler = this.settings.connect('changed::ui-language', () => {
            initTranslations(directory, this.settings.get_string('ui-language'));
            this.retranslate();
        });
        this.window.connect('close-request', () => {
            this.cancel.cancel();
            this.settings.disconnect(this._languageHandler);
            this.dialog?.destroy();
            this.pixbuf = null;
            return false;
        });
        this.retranslate();
        this.setTool('move');
    }

    retranslate() {
        this.window.title = _('Screenshot editor');
        const names = {move: _('Move image'), crop: _('Crop'), arrow: _('Arrow'), rectangle: _('Rectangle'),
            text: _('Text'), highlight: _('Highlight'), pen: _('Pen'), redact: _('Cover sensitive area')};
        for (const [tool, button] of this.toolButtons)
            button.label = names[tool];
        for (const {widget, message, icon} of this.labels) {
            widget.set_tooltip_text(_(message));
            if (!icon)
                widget.label = _(message);
        }
        this.color.set_tooltip_text(_('Color'));
        this.size.set_tooltip_text(_('Stroke width / text size'));
        this.zoom.set_tooltip_text(_('Zoom (%)'));
        this.text.placeholder_text = _('Text to add');
        this._update();
    }

    setTool(tool) {
        this.tool = tool;
        this.start = this.preview = null;
        for (const [name, button] of this.toolButtons)
            button.active = name === tool;
        this.text.visible = tool === 'text';
        if (tool === 'text' && this.size.value < 8)
            this.size.value = 24;
        else if (tool !== 'text' && this.size.value > 16)
            this.size.value = 4;
        this.canvas.queue_draw();
    }

    _transform(width = this.canvas.get_width(), height = this.canvas.get_height()) {
        return imageTransform(this.document.state.crop, width, height, this.zoom.value / 100, this.pan);
    }

    _begin(x, y) {
        this.canvas.grab_focus();
        this.origin = [x, y];
        this.oldPan = [...this.pan];
        const point = imagePoint(this.document.state.crop, this._transform(), x, y);
        const c = this.document.state.crop;
        if (point[0] < c.x || point[0] > c.x + c.width || point[1] < c.y || point[1] > c.y + c.height) {
            this.start = null;
            return;
        }
        this.start = point;
        this.points = [point];
    }

    _drag(dx, dy) {
        if (!this.start)
            return;
        if (this.tool === 'move') {
            this.pan = [this.oldPan[0] + dx, this.oldPan[1] + dy];
        } else {
            const end = this.document.point(...imagePoint(this.document.state.crop, this._transform(),
                this.origin[0] + dx, this.origin[1] + dy));
            if (this.tool === 'pen' && this.points.length < 1024)
                this.points.push(end);
            const rgba = this.color.get_rgba();
            const color = '#' + [rgba.red, rgba.green, rgba.blue].map(v =>
                Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            this.preview = {type: this.tool, x: this.start[0], y: this.start[1], x2: end[0], y2: end[1],
                width: this.size.value, color, text: this.text.text, points: this.points};
        }
        this.canvas.queue_draw();
    }

    _end(dx, dy) {
        this._drag(dx, dy);
        try {
            if (this.preview) {
                if (this.tool === 'crop') {
                    this.document.crop(this.start, [this.preview.x2, this.preview.y2]);
                    this.pan = [0, 0];
                    this.zoom.value = 100;
                } else if (this.tool !== 'text' || this.text.text.trim()) {
                    this.document.add(this.preview);
                }
            }
        } catch {
            this.toast(_('Annotation limit reached. Undo a mark before adding another.'));
        }
        this.start = this.preview = null;
        this._update();
    }

    _update() {
        this.undoButton.sensitive = this.document.past.length > 0;
        this.redoButton.sensitive = this.document.future.length > 0;
        const c = this.document.state.crop;
        this.dimensions.label = format(_('Image · %d × %d'), c.width, c.height);
        this.canvas.queue_draw();
    }

    toast(message) { this.overlay.add_toast(new Adw.Toast({title: message})); }

    async copy() {
        if (!this.copyButton.sensitive)
            return;
        this.copyButton.sensitive = false;
        try {
            await this.onCopy(exportPng(this.pixbuf, this.document.state));
            if (!this.cancel.is_cancelled())
                this.toast(_('Edited image copied. Paste it into your application.'));
        } catch {
            if (!this.cancel.is_cancelled())
                this.toast(_('Could not export the image. Crop it to reduce its size.'));
        } finally {
            this.copyButton.sensitive = true;
        }
    }

    save() {
        if (this.dialog)
            return;
        const dialog = new Gtk.FileChooserNative({title: _('Save image'), transient_for: this.window,
            action: Gtk.FileChooserAction.SAVE, modal: true});
        dialog.set_current_name('Super V screenshot.png');
        const filter = new Gtk.FileFilter();
        filter.add_mime_type('image/png');
        filter.name = 'PNG';
        dialog.add_filter(filter);
        this.dialog = dialog;
        dialog.connect('response', (_dialog, response) => {
            const file = response === Gtk.ResponseType.ACCEPT ? dialog.get_file() : null;
            dialog.destroy();
            this.dialog = null;
            if (!file)
                return;
            try {
                this.saveTo(file).then(() => {
                    if (!this.cancel.is_cancelled()) this.toast(_('Image saved.'));
                }).catch(() => {
                    if (!this.cancel.is_cancelled()) this.toast(_('Could not save the image.'));
                });
            } catch {
                this.toast(_('Could not export the image. Crop it to reduce its size.'));
            }
        });
        dialog.show();
    }

    saveTo(file) {
        const bytes = new GLib.Bytes(exportPng(this.pixbuf, this.document.state));
        return new Promise((resolve, reject) => {
            file.replace_contents_bytes_async(bytes, null, false, Gio.FileCreateFlags.PRIVATE,
                this.cancel, (f, result) => {
                    try { f.replace_contents_finish(result); resolve(); } catch (error) { reject(error); }
                });
        });
    }
}

async function writeOutput(stream, data, cancel) {
    let offset = 0;
    while (offset < data.length) {
        const chunk = new GLib.Bytes(data.slice(offset, offset + 4096));
        const written = await new Promise((resolve, reject) => stream.write_bytes_async(chunk,
            GLib.PRIORITY_DEFAULT, cancel, (s, r) => {
                try { resolve(s.write_bytes_finish(r)); } catch (error) { reject(error); }
            }));
        if (!written) throw new Error('Editor pipe closed');
        offset += written;
    }
}

async function readInput() {
    const stream = new GioUnix.InputStream({fd: 0, close_fd: false});
    const chunks = [];
    let size = 0;
    while (true) {
        const bytes = await new Promise((resolve, reject) => stream.read_bytes_async(65536,
            GLib.PRIORITY_DEFAULT, null, (s, r) => {
                try { resolve(s.read_bytes_finish(r).get_data()); } catch (error) { reject(error); }
            }));
        if (!bytes.length)
            break;
        size += bytes.length;
        if (size > MAX_IMAGE_BYTES)
            throw new Error('Input too large');
        chunks.push(bytes.slice());
    }
    const input = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length; }
    return input;
}

if (ARGV[0] === '--pipe') {
    const application = new Adw.Application({application_id: 'org.gnome.Shell.Extensions.SuperV.Editor',
        flags: Gio.ApplicationFlags.NON_UNIQUE});
    application.connect('activate', () => {
        application.hold();
        readInput().then(bytes => {
            const output = new GioUnix.OutputStream({fd: 1, close_fd: false});
            const editor = new ImageEditor(bytes, ARGV[1], application, png => {
                const frame = new TextEncoder().encode(JSON.stringify({png: GLib.base64_encode(png)}) + '\n');
                return writeOutput(output, frame, editor.cancel);
            });
            editor.window.present();
            application.release();
        }).catch(() => System.exit(1));
    });
    application.run([]);
}
