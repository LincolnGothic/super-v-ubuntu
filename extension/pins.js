// SPDX-License-Identifier: GPL-3.0-or-later
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {gettext as _} from './translations.js';
import {format, N_} from './core/localization.js';
import {PinBudget, pinGeometry} from './core/pins.js';
import {verticalBoxProperties} from './shell-compat.js';

export class ScreenPins {
    constructor(onCopy) {
        this.onCopy = onCopy;
        this.items = new Map();
        this.budget = new PinBudget();
        this.monitorSignal = Main.layoutManager.connect('monitors-changed', () => {
            for (const pin of this.items.values()) this._place(pin);
        });
    }
    add(bytes, mime, sourceId = null) {
        const id = this.budget.add(bytes, mime);
        let root;
        try {
            const info = this.budget.items.get(id);
            const loader = GdkPixbuf.PixbufLoader.new_with_mime_type(mime);
            let mismatch = false;
            loader.connect('size-prepared', (_loader, width, height) => {
                mismatch = width !== info.width || height !== info.height;
                const scale = Math.min(1, 1024 / width, 1024 / height);
                loader.set_size(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
            });
            try { loader.write(bytes); loader.close(); }
            catch (error) { try { loader.close(); } catch {} throw error; }
            const pixbuf = loader.get_pixbuf();
            if (!pixbuf || mismatch) throw new Error('Invalid screen pin');
            const content = St.ImageContent.new_with_preferred_size(pixbuf.width, pixbuf.height);
            const data = new GLib.Bytes(pixbuf.get_pixels());
            const args = [data, pixbuf.has_alpha ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
                pixbuf.width, pixbuf.height, pixbuf.rowstride];
            if (typeof content.set_preferred_width === 'function') {
                const backend = global.stage.context.get_backend();
                content.set_bytes(backend.get_cogl_context(), ...args);
            } else {
                content.set_bytes(...args);
            }
            root = new St.BoxLayout({...verticalBoxProperties(St.BoxLayout, Clutter),
                style_class: 'super-v-screen-pin', reactive: true, can_focus: true});
            const header = new St.BoxLayout({style_class: 'super-v-pin-controls', reactive: true});
            root.add_child(header);
            const image = new St.Widget({content, content_gravity: Clutter.ContentGravity.RESIZE_FILL,
                x_align: Clutter.ActorAlign.CENTER, reactive: true});
            root.add_child(image);
            const pin = {id, sourceId, root, image, zoom: 1, opacity: 100, width: info.width, height: info.height};
            const [x, y] = global.get_pointer();
            root.set_position(x, y);
            const button = (label, message, callback) => {
                const control = new St.Button({label, accessible_name: _(message), style_class: 'button super-v-pin-button',
                    reactive: true, can_focus: true});
                control.connect('clicked', callback); header.add_child(control); return control;
            };
            pin.copy = button('⧉', N_('Copy image'), () => this.onCopy(bytes, mime));
            pin.less = button('−', N_('Zoom out'), () => this.zoom(id, 1 / 1.25));
            pin.more = button('+', N_('Zoom in'), () => this.zoom(id, 1.25));
            pin.opacityButton = button('100%', N_('Opacity'), () => this.opacity(id, pin.opacity === 25 ? 100 : pin.opacity - 25));
            pin.close = button('×', N_('Close pinned image'), () => this.remove(id));
            root.connect('scroll-event', (_actor, event) => {
                const direction = event.get_scroll_direction();
                const delta = direction === Clutter.ScrollDirection.SMOOTH ? event.get_scroll_delta()[1] :
                    direction === Clutter.ScrollDirection.UP ? -1 : 1;
                if (delta) this.zoom(id, delta < 0 ? 1.1 : 1 / 1.1);
                return Clutter.EVENT_STOP;
            });
            for (const target of [header, image]) {
                target.connect('button-press-event', (_actor, event) => {
                    if (event.get_button() !== 1) return Clutter.EVENT_PROPAGATE;
                    this._drag(pin, event); return Clutter.EVENT_STOP;
                });
            }
            root.connect('key-press-event', (_actor, event) => {
                const key = event.get_key_symbol();
                if (key === Clutter.KEY_Escape) this.remove(id);
                else if ([Clutter.KEY_plus, Clutter.KEY_equal].includes(key)) this.zoom(id, 1.25);
                else if (key === Clutter.KEY_minus) this.zoom(id, 1 / 1.25);
                else return Clutter.EVENT_PROPAGATE;
                return Clutter.EVENT_STOP;
            });
            this.items.set(id, pin);
            Main.layoutManager.addChrome(root, {affectsStruts: false, trackFullscreen: false});
            this._place(pin);
            return id;
        } catch (error) {
            if (root) { Main.layoutManager.removeChrome(root); root.destroy(); }
            this.items.delete(id); this.budget.delete(id); throw error;
        }
    }
    _place(pin, x = pin.root.x, y = pin.root.y) {
        const monitor = Main.layoutManager.monitors.find(m => x >= m.x && y >= m.y && x < m.x + m.width && y < m.y + m.height)
            ?? Main.layoutManager.primaryMonitor;
        const area = global.workspace_manager.get_active_workspace().get_work_area_for_monitor(monitor.index);
        const g = pinGeometry(pin.width, pin.height, pin.zoom, area, x, y);
        pin.image.set_size(g.imageWidth, g.imageHeight);
        pin.root.set_width(g.width);
        pin.root.set_position(g.x, g.y);
    }
    zoom(id, factor) {
        const pin = this.items.get(id); if (!pin) return;
        pin.zoom = Math.max(0.25, Math.min(4, pin.zoom * factor)); this._place(pin);
    }
    opacity(id, percent) {
        const pin = this.items.get(id); if (!pin) return;
        pin.opacity = Math.max(25, Math.min(100, percent));
        pin.image.opacity = Math.round(pin.opacity * 255 / 100);
        pin.opacityButton.label = `${pin.opacity}%`;
        pin.opacityButton.accessible_name = format(_('Opacity: %d percent'), pin.opacity);
    }
    _drag(pin, event) {
        this._endDrag();
        const [startX, startY] = event.get_coords();
        const x = pin.root.x, y = pin.root.y;
        this.grab = global.stage.grab(pin.root);
        this.dragActor = pin.root;
        this.dragSignal = pin.root.connect('captured-event', (_stage, current) => {
            if (current.type() === Clutter.EventType.MOTION) {
                const [cx, cy] = current.get_coords(); this._place(pin, x + cx - startX, y + cy - startY);
                return Clutter.EVENT_STOP;
            }
            if (current.type() === Clutter.EventType.BUTTON_RELEASE) {
                this._endDrag(); return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }
    _endDrag() {
        if (this.dragSignal) this.dragActor.disconnect(this.dragSignal);
        this.dragActor = null;
        this.dragSignal = 0; this.grab?.dismiss(); this.grab = null;
    }
    remove(id) {
        this._endDrag();
        const pin = this.items.get(id); if (!pin) return;
        Main.layoutManager.removeChrome(pin.root); pin.root.destroy();
        this.items.delete(id); this.budget.delete(id);
    }
    removeSource(id) {
        for (const pin of [...this.items.values()]) if (pin.sourceId === id) this.remove(pin.id);
    }
    clear() { for (const id of [...this.items.keys()]) this.remove(id); }
    destroy() {
        this.clear(); Main.layoutManager.disconnect(this.monitorSignal); this.monitorSignal = 0;
    }
}
