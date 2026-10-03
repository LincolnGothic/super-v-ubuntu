// SPDX-License-Identifier: GPL-3.0-or-later
// Exercise the actual popup with St/Clutter adapters; this is not desktop rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadModule} from './helpers/load-module.js';
import {EmojiIndex} from '../extension/core/emoji.js';
import {History} from '../extension/core/history.js';
import {moveGridSelection} from '../extension/core/grid.js';

const data = JSON.parse(readFileSync('extension/data/emoji.json', 'utf8')).emoji;

async function fixture({count = 125, width = 1920, scale = 1, position = 'pointer',
    pointer = [500, 400], translate = message => message} = {}) {
    let focus = null;
    class Actor {
        constructor(properties = {}) {
            this.children = [];
            this.signals = new Map();
            this.pseudoClasses = new Set();
            Object.assign(this, properties);
            this.clutter_text = {line_wrap: false};
        }
        connect(signal, callback) { this.signals.set(signal, callback); }
        connectObject(...args) {
            for (let index = 0; index < args.length - 1; index += 2)
                this.connect(args[index], args[index + 1]);
        }
        emit(signal, ...args) { return this.signals.get(signal)?.(this, ...args); }
        add_child(child) { child.parent = this; this.children.push(child); }
        set_child(child) { this.children = []; this.add_child(child); }
        get_child() { return this.children[0] ?? {clutter_text: this.clutter_text}; }
        get_parent() { return this.parent; }
        get_last_child() { return this.children.at(-1); }
        get_n_children() { return this.children.length; }
        destroy_all_children() { this.children = []; }
        add_style_pseudo_class(name) { this.pseudoClasses.add(name); }
        remove_style_pseudo_class(name) { this.pseudoClasses.delete(name); }
        grab_key_focus() { focus = this; this.emit('key-focus-in'); }
        set_style(style) { this.style = style; }
        has_allocation() { return Boolean(this.box); }
        get_allocation_box() { assert.ok(this.box, 'must wait for layout'); return this.box; }
        get_transformed_position() { return [this.translation_x || 0, this.translation_y || 0]; }
        get_transformed_size() { return [390, 600]; }
        contains(actor) { return this === actor || this.children.some(child => child.contains(actor)); }
    }
    class BoxLayout extends Actor {
        get_layout_manager() { return {set_homogeneous: value => { this.homogeneous = value; }}; }
    }
    class Label extends Actor {
        constructor(properties) { super(properties); this.clutter_text = new Actor(); }
    }
    class Entry extends Label {
        constructor(properties) { super(properties); this.text = ''; }
        get_text() { return this.text; }
        set_text(text) {
            if (this.text === text)
                return;
            this.text = text;
            this.clutter_text.emit('text-changed');
        }
        grab_key_focus() { this.clutter_text.grab_key_focus(); }
    }
    class ScrollView extends Actor {
        get_vadjustment() { return adjustment; }
    }
    class ModalDialog extends Actor {
        _init() {
            this.contentLayout = new Actor(); this.dialogLayout = new Actor();
            const panel = new Actor();
            panel.add_child(this.contentLayout);
            this.dialogLayout.add_child(panel);
            this.dialogLayout.box = {};
            this.dialogLayout.get_transformed_size = () => [width, 1080];
            this._monitorConstraint = {};
            this.state = 0;
        }
        setInitialKeyFocus() {}
        open() { this.state = 1; return true; }
        close() { this.closed = true; this.state = 0; }
    }
    const adjustment = new Actor({value: 0, page_size: 150});
    let scrollValue = 0;
    adjustment.upper = Infinity;
    Object.defineProperty(adjustment, 'value', {
        get: () => scrollValue,
        set: value => { scrollValue = Math.max(0, Math.min(value, adjustment.upper - adjustment.page_size)); },
    });
    const clutter = {ActorAlign: {CENTER: 1, FILL: 0, START: 2}, ModifierType: {CONTROL_MASK: 1},
        EventType: {BUTTON_PRESS: 1, KEY_PRESS: 2}, EVENT_STOP: true, EVENT_PROPAGATE: false};
    for (const key of ['Escape', 'Tab', 'ISO_Left_Tab', 'f', 'F', 'Up', 'Down', 'Left', 'Right',
        'Return', 'KP_Enter', 'Delete'])
        clutter[`KEY_${key}`] = key;
    const st = {BoxLayout, Button: Actor, Label, Entry, ScrollView, Widget: Actor, Icon: Actor,
        PolicyType: {NEVER: 0, AUTOMATIC: 1}, ThemeContext: {get_for_stage: () => ({scale_factor: scale})}};
    const calls = [];
    const stage = Object.assign(new Actor(), {get_key_focus: () => focus});
    const controller = {history: new History(), emoji: new EmojiIndex(data.slice(0, count)),
        metadata: {'version-name': '0.1.3'},
        settings: {get_boolean: () => true, get_string: () => position},
        gifs: {search: () => [{path: '/tmp/wave.gif', name: 'wave.gif'}]},
        selectGif: entry => calls.push(['gif', entry]), select: (...args) => calls.push(args),
        deleteEntry: id => calls.push(['delete', id]), pin: id => calls.push(['pin', id])};
    const module = await loadModule('extension/popup.js', {
        'gi://Clutter': {default: clutter}, 'gi://GObject': {default: {registerClass: x => x}},
        'gi://Pango': {default: {EllipsizeMode: {NONE: 0, END: 1}, WrapMode: {WORD_CHAR: 1}}},
        'gi://Gio': {default: {FileIcon: {new: file => ({file})}, File: {new_for_path: path => path}}},
        'gi://Shell': {default: {ActionMode: {POPUP: 1}}}, 'gi://St': {default: st},
        'gettext': {dgettext: (_domain, message) => translate(message)},
        'resource:///org/gnome/shell/ui/modalDialog.js': {ModalDialog, State: {OPENED: 1, OPENING: 2}},
        'resource:///org/gnome/shell/ui/main.js': {layoutManager: {
            focusMonitor: {x: 0, y: 0, width, height: 1080, index: 0},
            primaryMonitor: {x: 0, y: 0, width, height: 1080, index: 0},
            monitors: [{x: 0, y: 0, width, height: 1080, index: 0}],
            getWorkAreaForMonitor: () => ({x: 0, y: 24, width, height: 1056}),
        }},
    }, {stage, get_pointer: () => pointer});
    const popup = new module.SuperVPopup();
    popup._init(controller);
    popup.showPanel();
    popup._setTab('emoji');
    const press = (key, ctrl = false) => popup._key({get_key_symbol: () => key,
        get_state: () => ctrl ? 1 : 0});
    return {popup, controller, calls, press, adjustment, stage, focus: () => focus};
}

test('loaded version is visible and all five tabs can be reached by keyboard', async () => {
    const {popup, press} = await fixture();
    assert.equal(popup._title.text, 'Super V 0.1.3');
    for (const name of ['kaomoji', 'symbols', 'gifs', 'clipboard', 'emoji']) {
        press('Tab', true);
        assert.equal(popup.tab, name);
    }
    press('ISO_Left_Tab', true);
    assert.equal(popup.tab, 'clipboard');
});

test('kaomoji and symbols use glyph-only grids and the character insertion path', async () => {
    const {popup, press, calls} = await fixture();
    popup._setTab('kaomoji');
    assert.equal(popup.list.get_child().get_n_children(), 3);
    assert.equal(popup._toneButton.visible, false);
    press('Down');
    assert.equal(popup.selected, 3);
    press('Return');
    assert.equal(calls[0][1], true);
    popup._setTab('symbols');
    popup.search.set_text('plus minus');
    assert.equal(popup._rows[0].get_child().text, '±');
    press('Return');
    assert.equal(calls[1][0].text, '±');
});

test('GIF favorites render previews and dispatch binary insertion', async () => {
    const {popup, press, calls} = await fixture();
    popup._setTab('gifs');
    assert.equal(popup._rows[0].get_child().gicon.file, '/tmp/wave.gif');
    assert.equal(popup._manageGifs.visible, true);
    assert.equal(popup._emojiControls.visible, false);
    press('Return');
    assert.equal(calls[0][0], 'gif');
    assert.equal(calls[0][1].path, '/tmp/wave.gif');
});

test('near-pointer placement clamps at screen edges and center mode resets translations', async () => {
    const {popup, controller} = await fixture({pointer: [1910, 1070]});
    popup._panel.box = {};
    popup.positionPanel();
    assert.equal(popup._panel.translation_x, 1518);
    assert.equal(popup._panel.translation_y, 458);
    controller.settings.get_string = () => 'center';
    popup.positionPanel();
    assert.equal(popup._panel.x_align, 1);
    assert.equal(popup._panel.translation_x, 0);
    assert.equal(popup._panel.translation_y, 0);
});

test('outside clicks dismiss through the stage or modal grab root; inside and closed clicks propagate', async () => {
    const {popup, stage} = await fixture();
    popup._panel.box = {};
    popup.positionPanel();
    const [x, y] = popup._panel.get_transformed_position();
    const click = coords => ({type: () => 1, get_coords: () => coords});
    assert.equal(stage.emit('captured-event', click([x + 20, y + 20])), false);
    assert.equal(popup.closed, undefined);
    assert.equal(stage.emit('captured-event', click([0, 0])), true);
    assert.equal(popup.closed, true);
    assert.equal(stage.emit('captured-event', click([0, 0])), false);
    popup.showPanel();
    popup.closed = false;
    assert.equal(popup.emit('captured-event', click([x + 20, y + 20])), false);
    assert.equal(popup.closed, false);
    assert.equal(popup.emit('captured-event', click([0, 0])), true);
    assert.equal(popup.closed, true);
});

test('emoji form six-column rows and the partial row keeps empty, unfocusable cells', async () => {
    const {popup} = await fixture({count: 8});
    assert.equal(popup.list.children.length, 2);
    assert.equal(popup._rows.length, 8);
    const [first, last] = popup.list.children;
    assert.equal(first.get_n_children(), 6);
    assert.equal(last.get_n_children(), 6);
    assert.equal(first.homogeneous, true);
    assert.equal(last.children.filter(x => x.can_focus).length, 2);
    for (const [index, tile] of popup._rows.entries()) {
        assert.equal(tile.get_child().text, data[index].text);
        assert.equal(tile.accessible_name, data[index].name);
        assert.equal(tile.get_child().clutter_text.ellipsize, 0);
    }
});

test('narrow monitors reduce columns and normal HiDPI monitors retain six', async () => {
    const narrow = await fixture({width: 300});
    assert.equal(narrow.popup._emojiColumns, 4);
    narrow.press('Down');
    assert.equal(narrow.popup.selected, 4);
    const hidpi = await fixture({width: 1920, scale: 2});
    assert.equal(hidpi.popup._emojiColumns, 6);
});

test('grid arrows move by row and cell, focus follows selection, and Enter selects that emoji', async () => {
    const {popup, press, focus, calls} = await fixture();
    press('Down');
    assert.equal(popup.selected, 6);
    assert.equal(focus(), popup._rows[6]);
    press('Right');
    assert.equal(popup.selected, 7);
    press('Up');
    assert.equal(popup.selected, 1);
    press('Left');
    assert.equal(popup.selected, 0);
    press('Return');
    assert.deepEqual(calls, [[data[0], true]]);
});

test('navigation stops at top/bottom and reaches a short final row without phantom cells', () => {
    assert.equal(moveGridSelection(4, 8, 6, 'up'), 4);
    assert.equal(moveGridSelection(5, 8, 6, 'down'), 7);
    assert.equal(moveGridSelection(6, 8, 6, 'down'), 6);
    assert.equal(moveGridSelection(7, 8, 6, 'right'), 7);
    assert.equal(moveGridSelection(0, 8, 6, 'left'), 0);
    assert.equal(moveGridSelection(5, 8, 6, 'right'), 6);
    assert.equal(moveGridSelection(6, 8, 6, 'left'), 5);
    assert.equal(moveGridSelection(0, 0, 6, 'down'), 0);
});

test('query Left/Right remain text editing keys, including after returning from the grid', async () => {
    const {popup, press, focus} = await fixture();
    popup.search.set_text('face');
    assert.equal(press('Left'), false);
    assert.equal(press('Right'), false);
    assert.equal(popup.selected, 0);
    press('Down');
    assert.equal(focus(), popup._rows[6]);
    press('f', true);
    assert.equal(focus(), popup.search.clutter_text);
    assert.equal(press('Left'), false);
});

test('keyboard pagination keeps focus and waits for row allocation before scrolling', async () => {
    const {popup, press, focus, adjustment} = await fixture();
    popup._rows[59].grab_key_focus();
    press('Right');
    assert.equal(popup.selected, 60);
    assert.equal(popup._rows.length, 120);
    assert.equal(focus(), popup._rows[60]);
    assert.equal(adjustment.value, 0);
    const row = popup._rows[60].get_parent();
    adjustment.upper = 300;
    row.box = {y1: 530, y2: 580};
    row.emit('notify::allocation');
    assert.equal(adjustment.value, 150);
    // St updates the scroll range after allocating the new children.
    adjustment.upper = 1000;
    adjustment.emit('notify::upper');
    assert.equal(adjustment.value, 430);
    const first = popup._rows[0].get_parent();
    first.box = {y1: 0, y2: 50};
    popup._rows[0].grab_key_focus();
    assert.equal(adjustment.value, 0);
});

test('Show more appends results in grid order and mouse activation uses the clicked tile', async () => {
    const {popup, calls} = await fixture();
    popup.list.get_last_child().emit('clicked');
    assert.equal(popup._rows.length, 120);
    popup._rows[75].emit('clicked');
    assert.deepEqual(calls, [[data[75], true]]);
});

test('search and Recent rebuild the grid, reset selection and handle empty results', async () => {
    const {popup, controller, press, calls} = await fixture();
    press('Down');
    press('f', true);
    popup.search.set_text('grinning');
    assert.equal(popup.selected, 0);
    assert.ok(popup.results.length > 0);
    assert.ok(popup.results.every(x => [x.name, ...x.keywords].join(' ').includes('grinning')));
    popup.search.set_text('no-such-emoji');
    assert.equal(popup._rows.length, 0);
    press('Down');
    press('Return');
    assert.equal(calls.length, 0);
    assert.equal(popup.list.get_child().text, 'No matching items.');
    popup.search.set_text('');
    popup.group = 'Recent';
    popup.refresh();
    assert.equal(popup._rows.length, 0);
    controller.emoji.use(data[3].text);
    popup.refresh();
    assert.equal(popup._rows.length, 1);
    assert.equal(popup._rows[0].get_child().text, data[3].text);
});

test('category and skin-tone filtering still produce only matching grid tiles', async () => {
    const {popup} = await fixture({count: data.length});
    popup.group = 'People & Body';
    popup.tone = 'medium';
    popup.search.set_text('scientist');
    assert.ok(popup.results.some(x => x.text === '👩🏽‍🔬'));
    assert.ok(popup.results.every(x => x.group === 'People & Body' &&
        x.tones.every(tone => tone === 'medium')));
    assert.equal(popup._rows.length, popup.results.length);
});

test('clipboard keeps text rows, pin/delete buttons and one-item Up/Down navigation', async () => {
    const {popup, controller, press, calls} = await fixture();
    controller.history.add('first');
    controller.history.add('second');
    popup._setTab('clipboard');
    assert.equal(popup.list.children.length, 2);
    assert.ok(popup.list.children.every(x => x.children.length === 3));
    assert.equal(popup._rows[0].get_child().text, 'second');
    press('Down');
    assert.equal(popup.selected, 1);
    assert.equal(press('Right'), false);
    press('Return');
    assert.equal(calls[0][0].text, 'first');
    assert.equal(calls[0][1], false);
    const firstRow = popup.list.get_child();
    firstRow.children[1].emit('clicked');
    firstRow.children[2].emit('clicked');
    assert.deepEqual(calls.slice(1), [['pin', popup.results[0].id], ['delete', popup.results[0].id]]);
});

// Translated labels must not become filter IDs or alter keyboard navigation.
test('translated category and tone labels preserve filtering and accessibility', async () => {
    const labels = {'Category: %s': '类别：%s', 'People & Body': '人物与身体',
        'Tone: %s': '肤色：%s', Medium: '中等', Settings: '设置', 'Pin entry': '固定条目'};
    const {popup} = await fixture({count: data.length, translate: message => labels[message] ?? message});
    popup.group = 'People & Body';
    popup.tone = 'medium';
    popup.search.set_text('scientist');
    assert.equal(popup._groupButton.label, '类别：人物与身体');
    assert.equal(popup._toneButton.label, '肤色：中等');
    assert.ok(popup.results.some(x => x.text === '👩🏽‍🔬'));
    assert.equal(popup.group, 'People & Body');
});
