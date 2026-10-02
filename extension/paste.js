// SPDX-License-Identifier: GPL-3.0-or-later
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {canPaste, choosePasteShortcut} from './core/paste.js';
import {getDefaultSeat, hasShellKeyFocus} from './shell-compat.js';

export class PasteBackend {
    constructor(settings, identifiers, onFallback) {
        this.settings = settings;
        this.identifiers = identifiers;
        this.onFallback = onFallback;
        this._source = 0;
        this._device = null;
    }

    cancel() {
        if (this._source)
            GLib.source_remove(this._source);
        this._source = 0;
    }

    paste(target) {
        this.cancel();
        if (!this.settings.get_boolean('auto-paste') || !target ||
            !target.get_compositor_private()) {
            this.onFallback();
            return;
        }
        const shortcut = choosePasteShortcut(this.identifiers(target),
            this.settings.get_strv('terminal-apps'), this.settings.get_string('paste-overrides'));
        if (shortcut === 'manual') {
            this.onFallback();
            return;
        }
        try {
            Main.activateWindow(target);
        } catch {
            this.onFallback();
            return;
        }
        let attempts = 0;
        this._source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
            const [, , state] = global.get_pointer();
            const held = state & (Clutter.ModifierType.CONTROL_MASK |
                Clutter.ModifierType.SHIFT_MASK | Clutter.ModifierType.MOD1_MASK |
                Clutter.ModifierType.MOD4_MASK | Clutter.ModifierType.SUPER_MASK);
            const focused = global.display.focus_window === target;
            const locked = Main.sessionMode.isLocked || Main.sessionMode.isGreeter;
            if (!focused || locked || !target.get_compositor_private() || ++attempts > 24) {
                this._source = 0;
                this.onFallback();
                return GLib.SOURCE_REMOVE;
            }
            if (!canPaste({enabled: this.settings.get_boolean('auto-paste'),
                targetExists: true, targetFocused: focused, locked,
                modifiersHeld: Boolean(held), shellFocused: hasShellKeyFocus(global.stage)}))
                return GLib.SOURCE_CONTINUE;
            this._source = 0;
            try {
                this._send(shortcut);
            } catch {
                this.onFallback();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _send(shortcut) {
        this._device ??= getDefaultSeat(global.stage, Clutter)
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        const keys = shortcut === 'shift-insert' ? [Clutter.KEY_Shift_L, Clutter.KEY_Insert]
            : shortcut === 'ctrl-shift-v' ? [Clutter.KEY_Control_L, Clutter.KEY_Shift_L, Clutter.KEY_v]
                : [Clutter.KEY_Control_L, Clutter.KEY_v];
        const pressed = [];
        try {
            for (const key of keys) {
                pressed.push(key);
                this._device.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.PRESSED);
            }
        } finally {
            let releaseFailed = false;
            for (const key of pressed.reverse()) {
                try {
                    this._device.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.RELEASED);
                } catch {
                    releaseFailed = true;
                }
            }
            if (releaseFailed)
                throw new Error('Virtual keyboard release failed');
        }
    }

    destroy() {
        this.cancel();
        this._device = null;
    }
}
