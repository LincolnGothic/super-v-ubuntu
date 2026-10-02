// SPDX-License-Identifier: GPL-3.0-or-later
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {getEventActor, verticalBoxProperties, horizontalBoxProperties} from './shell-compat.js';
import {moveGridSelection} from './core/grid.js';
import {CatalogIndex, kaomoji, symbols} from './core/catalog.js';
import {placeNearPointer, pointInRect} from './core/placement.js';

function button(label, action, style = 'button') {
    const actor = new St.Button({label, style_class: style,
        can_focus: true, reactive: true, accessible_name: label});
    actor.connect('clicked', action);
    return actor;
}

export const SuperVPopup = GObject.registerClass(
class SuperVPopup extends ModalDialog.ModalDialog {
    _init(controller) {
        super._init({styleClass: 'modal-dialog super-v-popup',
            shellReactive: true, actionMode: Shell.ActionMode.POPUP,
            shouldFadeIn: false, shouldFadeOut: false, destroyOnClose: false});
        this.controller = controller;
        this.tab = 'clipboard';
        this.group = 'All';
        this.tone = 'all';
        this.selected = 0;
        this.pageSize = 60;
        this._emojiColumns = 6;
        this._visibleCount = this.pageSize;
        this.catalogs = {kaomoji: new CatalogIndex(kaomoji), symbols: new CatalogIndex(symbols)};
        const horizontal = horizontalBoxProperties(St.BoxLayout, Clutter);
        const header = new St.BoxLayout({...horizontal, style_class: 'super-v-header', x_expand: true});
        this._title = new St.Label({text: `Super V ${controller.metadata?.['version-name'] ?? ''}`.trim(),
            style_class: 'super-v-title',
            x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        header.add_child(this._title);
        header.add_child(button('Settings', () => {
            this.close();
            controller.openPreferences();
        }));
        this.contentLayout.add_child(header);
        const tabs = new St.BoxLayout({...horizontal, style_class: 'super-v-tabs'});
        this._clipboardTab = button('Clipboard', () => this._setTab('clipboard'));
        this._emojiTab = button('Emoji', () => this._setTab('emoji'));
        this._tabs = new Map([['clipboard', this._clipboardTab], ['emoji', this._emojiTab]]);
        for (const [name, label, accessible] of [['kaomoji', ';-)', 'Kaomoji and text emoticons'],
            ['symbols', 'Ω', 'Symbols'], ['gifs', 'GIF', 'GIF favorites']]) {
            const actor = button(label, () => this._setTab(name));
            actor.accessible_name = accessible;
            this._tabs.set(name, actor);
        }
        for (const actor of this._tabs.values())
            tabs.add_child(actor);
        this.contentLayout.add_child(tabs);
        this.search = new St.Entry({hint_text: 'Search clipboard', can_focus: true,
            x_expand: true, style_class: 'search-entry', accessible_name: 'Search'});
        this.search.clutter_text.connect('text-changed', () => {
            this.selected = 0;
            this._visibleCount = this.pageSize;
            this.refresh();
        });
        this.contentLayout.add_child(this.search);
        const vertical = verticalBoxProperties(St.BoxLayout, Clutter);
        this._emojiControls = new St.BoxLayout({...vertical, style_class: 'super-v-tabs'});
        this._groupButton = button('Category: All', () => {
            const groups = this.tab === 'emoji' ? ['All', 'Recent', ...controller.emoji.groups]
                : ['All', ...this.catalogs[this.tab].groups];
            this.group = groups[(groups.indexOf(this.group) + 1) % groups.length];
            this.selected = 0;
            this._visibleCount = this.pageSize;
            this.refresh();
        });
        this._toneButton = button('Tone: All', () => {
            const tones = ['all', 'default', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'];
            this.tone = tones[(tones.indexOf(this.tone) + 1) % tones.length];
            this.selected = 0;
            this._visibleCount = this.pageSize;
            this.refresh();
        });
        this._emojiControls.add_child(this._groupButton);
        this._emojiControls.add_child(this._toneButton);
        this.contentLayout.add_child(this._emojiControls);
        this.scroll = new St.ScrollView({style_class: 'super-v-scroll', x_expand: true,
            overlay_scrollbars: true, hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC});
        this.list = new St.BoxLayout({...vertical, x_expand: true,
            style_class: 'super-v-list'});
        this.scroll.set_child(this.list);
        this.scroll.get_vadjustment().connectObject(
            'notify::upper', () => this._scrollToSelection(),
            'notify::page-size', () => this._scrollToSelection(), this);
        this.contentLayout.add_child(this.scroll);
        const footer = new St.BoxLayout({...horizontal, style_class: 'super-v-footer'});
        this._clear = button('Clear unpinned', () => controller.clear(false));
        this._restore = button('Restore clipboard', () => controller.restoreClipboard());
        footer.add_child(this._clear);
        footer.add_child(this._restore);
        this._manageGifs = button('Add / manage GIFs', () => {
            this.close();
            controller.openPreferences();
        });
        footer.add_child(this._manageGifs);
        this.contentLayout.add_child(footer);
        this._hint = new St.Label({text: '↑↓ Select · Enter Paste · Esc Close · Ctrl+Tab Switch',
            style_class: 'super-v-hint'});
        this._hint.clutter_text.line_wrap = true;
        this.contentLayout.add_child(this._hint);
        this.setInitialKeyFocus(this.search.clutter_text);
        this.connect('captured-event', (_actor, event) => {
            if (event.type() === Clutter.EventType.KEY_PRESS)
                return this._key(event);
            return Clutter.EVENT_PROPAGATE;
        });
        // Clicks on other Shell actors are outside this widget's event ancestry.
        // Observe the stage, rather than waiting for the popup to receive them.
        global.stage.connectObject('captured-event', (_stage, event) => this._outsideEvent(event), this);
        this.connect('opened', () => this.positionPanel());
        this.dialogLayout.connect('notify::allocation', () => this.positionPanel());
    }

    showPanel() {
        this.tab = 'clipboard';
        this.selected = 0;
        this._visibleCount = this.pageSize;
        this.search.set_text('');
        this._anchor = global.get_pointer().slice(0, 2);
        this._positionMode = this.controller.settings.get_string('popup-position');
        const monitor = this._positionMode === 'center'
            ? Main.layoutManager.focusMonitor ?? Main.layoutManager.primaryMonitor
            : Main.layoutManager.monitors.find(m => pointInRect(this._anchor, [m.x, m.y], [m.width, m.height]))
                ?? Main.layoutManager.primaryMonitor;
        this._monitor = monitor;
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const height = Math.max(160, Math.min(330, monitor.height / scale - 230));
        const width = Math.max(220, Math.min(390, monitor.width / scale - 48));
        // Leave room for popup padding and keep tiles usable on narrow monitors.
        this._emojiColumns = Math.max(1, Math.min(6, Math.floor((width - 36) / 54)));
        this.scroll.set_style(`height: ${height}px;`);
        this.dialogLayout.set_style(`width: ${width}px;`);
        this.refresh();
        const opened = this.open();
        if (opened) {
            this._monitorConstraint.index = monitor.index;
            this.positionPanel();
            this.search.grab_key_focus();
        }
        return opened;
    }

    positionPanel() {
        if (!this._monitor)
            return;
        const centered = this.controller.settings.get_string('popup-position') === 'center';
        this.dialogLayout.x_align = centered ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;
        this.dialogLayout.y_align = centered ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;
        if (centered) {
            this.dialogLayout.translation_x = 0;
            this.dialogLayout.translation_y = 0;
        } else if (this.dialogLayout.has_allocation()) {
            const area = Main.layoutManager.getWorkAreaForMonitor(this._monitor.index);
            const size = this.dialogLayout.get_transformed_size();
            const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
            const position = placeNearPointer(this._anchor, area, size, 12 * scale);
            this.dialogLayout.translation_x = position.x - this._monitor.x;
            this.dialogLayout.translation_y = position.y - this._monitor.y;
        }
    }

    _outsideEvent(event) {
        if (![ModalDialog.State.OPENED, ModalDialog.State.OPENING].includes(this.state) ||
            event.type() !== Clutter.EventType.BUTTON_PRESS)
            return Clutter.EVENT_PROPAGATE;
        const inside = this.dialogLayout.has_allocation()
            ? pointInRect(event.get_coords(), this.dialogLayout.get_transformed_position(),
                this.dialogLayout.get_transformed_size())
            : Boolean(getEventActor(global.stage, event) &&
                this.dialogLayout.contains(getEventActor(global.stage, event)));
        if (inside)
            return Clutter.EVENT_PROPAGATE;
        this.close();
        return Clutter.EVENT_STOP;
    }

    _setTab(tab) {
        this.tab = tab;
        this.group = 'All';
        this.selected = 0;
        this._visibleCount = this.pageSize;
        this.search.set_text('');
        this.refresh();
        this.search.grab_key_focus();
    }

    refresh() {
        this.list.destroy_all_children();
        const clipboard = this.tab === 'clipboard';
        const gif = this.tab === 'gifs';
        const emoji = this.tab === 'emoji';
        const columns = this.tab === 'kaomoji' ? Math.min(3, this._emojiColumns)
            : gif ? Math.min(3, this._emojiColumns) : this._emojiColumns;
        this._emojiControls.visible = !clipboard && !gif;
        this._toneButton.visible = emoji;
        this._clear.visible = clipboard;
        this._manageGifs.visible = gif;
        this._restore.visible = Boolean(this.controller.pendingRestore);
        this._groupButton.label = `Category: ${this.group}`;
        this._toneButton.label = `Tone: ${this.tone}`;
        this.search.hint_text = clipboard ? 'Search clipboard' : gif ? 'Search GIF filenames'
            : emoji ? 'Search emoji' : this.tab === 'kaomoji' ? 'Search kaomoji' : 'Search symbols';
        this._hint.text = clipboard ? '↑↓ Select · Enter Paste · Esc Close · Ctrl+Tab Switch'
            : '↑↓←→ Select · Enter Paste · Ctrl+F Search · Esc Close';
        for (const [name, actor] of this._tabs) {
            const active = name === this.tab;
            if (active)
                actor.add_style_pseudo_class('checked');
            else
                actor.remove_style_pseudo_class('checked');
        }
        const query = this.search.get_text();
        this.results = clipboard ? this.controller.history.search(query)
            : gif ? this.controller.gifs.search(query)
                : emoji ? this.controller.emoji.search(query, this.group, this.tone)
                    : this.catalogs[this.tab].search(query, this.group);
        this.selected = Math.max(0, Math.min(this.selected, this.results.length - 1));
        this._rows = [];
        if (!this.results.length) {
            const message = query ? 'No matching items.' : clipboard
                ? this.controller.settings.get_boolean('history-enabled')
                    ? 'Copy some text to start your history.' : 'History is paused. Enable it in Settings.'
                : gif ? 'Add GIF files in Settings. GIF insertion requires an app that accepts images.'
                    : this.group === 'Recent' ? 'Your recently used emoji will appear here.' : 'No items in this filter.';
            const label = new St.Label({text: message, style_class: 'super-v-empty'});
            label.clutter_text.line_wrap = true;
            this.list.add_child(label);
        }
        let row;
        for (const [index, entry] of this.results.slice(0, this._visibleCount).entries()) {
            if (clipboard || index % columns === 0) {
                row = new St.BoxLayout({...horizontalBoxProperties(St.BoxLayout, Clutter),
                    style_class: clipboard ? 'super-v-row' : 'super-v-emoji-row',
                    x_expand: true});
                if (!clipboard)
                    row.get_layout_manager().set_homogeneous(true);
                // Newly rendered rows have no allocation until the next layout pass.
                row.connect('notify::allocation', actor => {
                    if (actor === this._rows[this.selected]?.get_parent())
                        this._scrollToSelection();
                });
                this.list.add_child(row);
            }
            const select = button('', () => this._activate(index),
                clipboard ? 'button super-v-item' : gif ? 'button super-v-gif'
                    : this.tab === 'kaomoji' ? 'button super-v-kaomoji' : 'button super-v-emoji');
            select.x_expand = true;
            const text = entry.text ?? '';
            select.accessible_name = clipboard ? `${entry.pinned ? 'Pinned: ' : ''}${text.slice(0, 500)}` : entry.name;
            const preview = Array.from(text).slice(0, 240).join('')
                .replace(/[\r\n]+/gu, ' ↵ ').replace(/[\x01-\x1f\x7f]/gu, ' ');
            const label = gif ? new St.Icon({gicon: Gio.FileIcon.new(Gio.File.new_for_path(entry.path)),
                icon_size: 84}) : new St.Label({text: clipboard ? preview : text, x_expand: clipboard,
                x_align: clipboard ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER});
            if (!gif)
                label.clutter_text.ellipsize = clipboard ? Pango.EllipsizeMode.END : Pango.EllipsizeMode.NONE;
            select.set_child(label);
            select.connect('key-focus-in', () => {
                this.selected = index;
                this._highlight();
            });
            row.add_child(select);
            if (clipboard) {
                row.add_child(button(entry.pinned ? '★' : '☆', () => {
                    this.controller.pin(entry.id);
                }, 'button super-v-icon'));
                const pin = row.get_last_child();
                pin.accessible_name = entry.pinned ? 'Unpin entry' : 'Pin entry';
                row.add_child(button('×', () => this.controller.deleteEntry(entry.id), 'button super-v-icon'));
                row.get_last_child().accessible_name = 'Delete entry';
            }
            this._rows.push(select);
        }
        // Preserve column widths in a partially filled last row without adding focus targets.
        if (!clipboard && row) {
            while (row.get_n_children() < columns)
                row.add_child(new St.Widget({x_expand: true}));
        }
        if (this.results.length > this._visibleCount) {
            this.list.add_child(button(`Show more (${this.results.length - this._visibleCount})`, () => {
                this._visibleCount += this.pageSize;
                this.refresh();
            }));
        }
        this._highlight();
    }

    _highlight() {
        for (const [index, actor] of this._rows.entries()) {
            if (index === this.selected)
                actor.add_style_pseudo_class('focus');
            else
                actor.remove_style_pseudo_class('focus');
        }
        this._scrollToSelection();
    }

    _scrollToSelection() {
        const row = this._rows?.[this.selected]?.get_parent();
        if (row?.has_allocation()) {
            const adjustment = this.scroll.get_vadjustment();
            const box = row.get_allocation_box();
            if (box.y1 < adjustment.value)
                adjustment.value = box.y1;
            else if (box.y2 > adjustment.value + adjustment.page_size)
                adjustment.value = box.y2 - adjustment.page_size;
        }
    }

    _activate(index) {
        const entry = this.results[index];
        if (entry) {
            if (this.tab === 'gifs')
                this.controller.selectGif(entry);
            else
                this.controller.select(entry, this.tab !== 'clipboard');
        }
    }

    _key(event) {
        const key = event.get_key_symbol();
        const ctrl = event.get_state() & Clutter.ModifierType.CONTROL_MASK;
        if (key === Clutter.KEY_Escape) {
            this.close();
            return Clutter.EVENT_STOP;
        }
        if (ctrl && [Clutter.KEY_Tab, Clutter.KEY_ISO_Left_Tab].includes(key)) {
            const names = [...this._tabs.keys()];
            const step = key === Clutter.KEY_ISO_Left_Tab ? names.length - 1 : 1;
            this._setTab(names[(names.indexOf(this.tab) + step) % names.length]);
            return Clutter.EVENT_STOP;
        }
        if (ctrl && [Clutter.KEY_f, Clutter.KEY_F].includes(key)) {
            this.search.grab_key_focus();
            return Clutter.EVENT_STOP;
        }
        const focus = global.stage.get_key_focus();
        const itemFocused = this._rows.includes(focus);
        const emoji = this.tab !== 'clipboard';
        // Left/Right keep editing the query until focus has moved into the grid.
        const horizontal = emoji && itemFocused && [Clutter.KEY_Left, Clutter.KEY_Right].includes(key);
        if ([Clutter.KEY_Up, Clutter.KEY_Down].includes(key) || horizontal) {
            const direction = key === Clutter.KEY_Up ? 'up' : key === Clutter.KEY_Down ? 'down'
                : key === Clutter.KEY_Left ? 'left' : 'right';
            this.selected = moveGridSelection(this.selected, this.results.length,
                emoji ? ['kaomoji', 'gifs'].includes(this.tab) ? Math.min(3, this._emojiColumns)
                    : this._emojiColumns : 1, direction);
            if (this.selected >= this._visibleCount) {
                this._visibleCount += this.pageSize;
                this.refresh();
            }
            if (emoji || itemFocused)
                this._rows[this.selected]?.grab_key_focus();
            this._highlight();
            return Clutter.EVENT_STOP;
        }
        if ([Clutter.KEY_Return, Clutter.KEY_KP_Enter].includes(key) &&
            (global.stage.get_key_focus() === this.search.clutter_text ||
             this._rows.some(x => x === global.stage.get_key_focus()))) {
            this._activate(this.selected);
            return Clutter.EVENT_STOP;
        }
        if (key === Clutter.KEY_Delete && this.tab === 'clipboard') {
            const entry = this.results[this.selected];
            if (entry)
                this.controller.deleteEntry(entry.id);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
});
