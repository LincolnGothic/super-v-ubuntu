// SPDX-License-Identifier: GPL-3.0-or-later
// Mocked Mutter adapters test actual extension code, not a real desktop.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {History} from '../extension/core/history.js';
import {EmojiIndex} from '../extension/core/emoji.js';

async function loadModule(file, mocks, globalObject = {}) {
    const context = vm.createContext({TextEncoder, TextDecoder, console, global: globalObject});
    const modules = new Map();
    function get(name, parent) {
        const key = name.startsWith('.') ? resolve(dirname(parent), name) : name;
        if (modules.has(key))
            return modules.get(key);
        let module;
        const mock = mocks[key] ?? mocks[name];
        if (mock) {
            module = new vm.SyntheticModule(Object.keys(mock), function () {
                for (const [name, value] of Object.entries(mock))
                    this.setExport(name, value);
            }, {context, identifier: key});
        } else {
            module = new vm.SourceTextModule(readFileSync(key, 'utf8'), {context, identifier: key});
        }
        modules.set(key, module);
        return module;
    }
    const module = get(resolve(file), '');
    await module.link((name, parent) => get(name, parent.identifier));
    await module.evaluate();
    return module.namespace;
}

function clipboardFixture() {
    let changed;
    const pending = [];
    const timers = new Map();
    let counter = 0;
    const captured = [];
    const selection = {
        mimes: ['text/plain;charset=utf-8'],
        connect(name, handler) { changed = handler; return 1; },
        disconnect() { changed = null; },
        get_mimetypes() { return this.mimes; },
        transfer_async(type, mime, size, output, cancellable, callback) {
            pending.push({type, mime, size, output, cancellable, callback});
        },
        transfer_finish() { return true; },
    };
    class Cancellable { cancel() { this.cancelled = true; } }
    const gio = {Cancellable, MemoryOutputStream: {new_resizable() {
        return {data: new Uint8Array(), closed: false, close() { this.closed = true; },
            is_closed() { return this.closed; }, steal_as_bytes() { return {get_data: () => this.data}; }};
    }}};
    const glib = {PRIORITY_DEFAULT: 0, SOURCE_REMOVE: false, get_monotonic_time: () => 1_000_000,
        timeout_add(priority, time, callback) { const id = ++counter; timers.set(id, callback); return id; },
        source_remove(id) { timers.delete(id); }};
    const clipboard = {set_text(type, text) {
        changed?.(selection, 1);
        finish(text);
    }};
    const values = {'history-enabled': true, 'excluded-apps': []};
    const settings = {get_boolean: key => values[key], get_strv: key => values[key]};
    function finish(text, index = 0) {
        const p = pending.splice(index, 1)[0];
        if (!p)
            return;
        p.output.data = new TextEncoder().encode(text).slice(0, p.size);
        p.callback(selection, {});
    }
    return {selection, values, settings, captured, pending, timers, finish,
        event: type => changed?.(selection, type),
        mocks: {'gi://Gio': {default: gio}, 'gi://GLib': {default: glib},
            'gi://Meta': {default: {SelectionType: {SELECTION_CLIPBOARD: 1}}},
            'gi://St': {default: {Clipboard: {get_default: () => clipboard}, ClipboardType: {CLIPBOARD: 1}}}},
        global: {display: {get_selection: () => selection}},
    };
}
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
async function monitor(fixture, ids = () => []) {
    const module = await loadModule('extension/clipboard.js', fixture.mocks, fixture.global);
    return new module.ClipboardMonitor(fixture.settings, ids, x => fixture.captured.push(x));
}

test('clipboard only reads clipboard selections and caps transferred bytes', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    f.event(0);
    assert.equal(f.pending.length, 0);
    f.event(1);
    assert.equal(f.pending[0].size, 16385);
    f.finish('A');
    await settle();
    assert.deepEqual(f.captured, ['A']);
    assert.equal(f.timers.size, 0);
    m.destroy();
});
test('oversized clipboard is dropped, never silently truncated into history', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    f.event(1);
    f.finish('x'.repeat(20000));
    await settle();
    assert.deepEqual(f.captured, []);
    m.destroy();
});
test('new owner invalidates stale asynchronous read', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    f.event(1);
    const old = f.pending[0];
    f.event(1);
    assert.equal(old.cancellable.cancelled, true);
    f.finish('old');
    f.finish('new');
    await settle();
    assert.deepEqual(f.captured, ['new']);
    m.destroy();
});
for (const hint of ['x-kde-passwordManagerHint', 'application/x-keepassxc', 'x-gtk-password']) {
    test(`password MIME hint skips capture ${hint}`, async () => {
        const f = clipboardFixture();
        const m = await monitor(f);
        f.selection.mimes.push(hint);
        f.event(1);
        await settle();
        assert.equal(f.pending.length, 0);
        m.destroy();
    });
}
test('focused excluded application skips capture', async () => {
    const f = clipboardFixture();
    f.values['excluded-apps'] = ['KeePassXC'];
    const m = await monitor(f, () => ['keepassxc']);
    f.event(1);
    assert.equal(f.pending.length, 0);
    m.destroy();
});
test('privacy change invalidates in-flight clipboard read', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    f.event(1);
    f.values['history-enabled'] = false;
    m.invalidate();
    f.finish('private');
    await settle();
    assert.deepEqual(f.captured, []);
    m.destroy();
});
test('own emoji/restore writes do not pollute history', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    m.write('😀');
    await settle();
    m.write('saved');
    await settle();
    assert.deepEqual(f.captured, []);
    m.destroy();
});
test('disable cancels pending reads and callbacks cannot capture', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    f.event(1);
    const p = f.pending[0];
    m.destroy();
    assert.equal(p.cancellable.cancelled, true);
    f.finish('after-disable');
    await settle();
    assert.deepEqual(f.captured, []);
    assert.equal(f.timers.size, 0);
});

test('lock suspension blocks collection and unlock resumes it', async () => {
    const f = clipboardFixture();
    const m = await monitor(f);
    m.setSuspended(true);
    f.event(1);
    assert.equal(f.pending.length, 0);
    m.setSuspended(false);
    f.event(1);
    f.finish('public');
    await settle();
    assert.deepEqual(f.captured, ['public']);
    m.destroy();
});

async function pasteFixture(modern = false) {
    const timers = new Map();
    const keys = [];
    let counter = 0;
    let fallbacks = 0;
    const target = {get_compositor_private: () => ({})};
    const state = {display: {focus_window: target}, stage: {get_key_focus: () => null},
        held: 0, get_pointer() { return [0, 0, this.held]; }};
    const device = {notify_keyval(time, key, pressed) { keys.push([key, pressed]); }};
    const clutter = {get_default_backend: () => ({get_default_seat: () => ({create_virtual_device: () => device})}),
        InputDeviceType: {KEYBOARD_DEVICE: 1}, KeyState: {PRESSED: 1, RELEASED: 0},
        KEY_Control_L: 1, KEY_Shift_L: 2, KEY_v: 3, KEY_Insert: 4,
        ModifierType: {CONTROL_MASK: 1, SHIFT_MASK: 2, MOD1_MASK: 4, MOD4_MASK: 8, SUPER_MASK: 16}};
    if (modern) {
        state.stage.context = {get_backend: clutter.get_default_backend};
        delete clutter.get_default_backend;
    }
    const glib = {PRIORITY_DEFAULT: 0, SOURCE_CONTINUE: true, SOURCE_REMOVE: false,
        get_monotonic_time: () => 1, source_remove(id) { timers.delete(id); },
        timeout_add(priority, time, callback) { timers.set(++counter, callback); return counter; }};
    const main = {sessionMode: {isLocked: false, isGreeter: false}, activateWindow() {}};
    const settings = {get_boolean: () => true, get_strv: () => ['terminal'], get_string: () => '{}'};
    const module = await loadModule('extension/paste.js', {'gi://Clutter': {default: clutter},
        'gi://GLib': {default: glib}, 'resource:///org/gnome/shell/ui/main.js': main}, state);
    const backend = new module.PasteBackend(settings, () => ['terminal'], () => fallbacks++);
    function tick() {
        for (const [id, callback] of [...timers]) {
            if (!callback())
                timers.delete(id);
        }
    }
    return {backend, target, state, main, settings, timers, keys, device, tick, fallback: () => fallbacks};
}
test('paste adapter uses terminal shortcut and releases keys in reverse order', async () => {
    const f = await pasteFixture();
    f.backend.paste(f.target);
    f.tick();
    assert.deepEqual(f.keys, [[1, 1], [2, 1], [3, 1], [3, 0], [2, 0], [1, 0]]);
    assert.equal(f.timers.size, 0);
    f.backend.destroy();
});
test('GNOME 50 paste obtains the virtual keyboard through the stage context', async () => {
    const f = await pasteFixture(true);
    f.backend.paste(f.target);
    f.tick();
    assert.deepEqual(f.keys, [[1, 1], [2, 1], [3, 1], [3, 0], [2, 0], [1, 0]]);
    assert.equal(f.fallback(), 0);
    f.backend.destroy();
});
test('GNOME 46 stage-as-focus does not prevent application paste', async () => {
    const f = await pasteFixture();
    f.state.stage.get_key_focus = () => f.state.stage;
    f.backend.paste(f.target);
    f.tick();
    assert.equal(f.keys.length, 6);
    assert.equal(f.fallback(), 0);
    f.backend.destroy();
});
test('paste adapter aborts on a different focus instead of injecting keys', async () => {
    const f = await pasteFixture();
    f.backend.paste(f.target);
    f.state.display.focus_window = {};
    f.tick();
    assert.deepEqual(f.keys, []);
    assert.equal(f.fallback(), 1);
});
test('paste adapter waits for physical modifiers, then safely times out', async () => {
    const f = await pasteFixture();
    f.state.held = 16;
    f.backend.paste(f.target);
    for (let i = 0; i < 25; i++)
        f.tick();
    assert.deepEqual(f.keys, []);
    assert.equal(f.fallback(), 1);
    assert.equal(f.timers.size, 0);
});
test('paste adapter disable cancels scheduled input', async () => {
    const f = await pasteFixture();
    f.backend.paste(f.target);
    f.backend.destroy();
    f.tick();
    assert.deepEqual(f.keys, []);
    assert.equal(f.timers.size, 0);
});
test('paste adapter attempts remaining releases after a release failure', async () => {
    const f = await pasteFixture();
    f.device.notify_keyval = (time, key, pressed) => {
        f.keys.push([key, pressed]);
        if (key === 3 && !pressed)
            throw new Error('Injected failure');
    };
    f.backend.paste(f.target);
    f.tick();
    assert.deepEqual(f.keys.slice(-3), [[3, 0], [2, 0], [1, 0]]);
    assert.equal(f.fallback(), 1);
});

async function controller() {
    const emoji = JSON.parse(readFileSync('extension/data/emoji.json', 'utf8'));
    const mockPath = name => resolve(`extension/${name}`);
    const mocks = {
        'gi://Gio': {default: {}}, 'gi://Meta': {default: {}}, 'gi://Shell': {default: {}},
        'resource:///org/gnome/shell/ui/main.js': {notify() {}},
        'resource:///org/gnome/shell/ui/modalDialog.js': {State: {OPENED: 1, OPENING: 2}},
        'resource:///org/gnome/shell/extensions/extension.js': {Extension: class {}},
        [mockPath('storage.js')]: {StateStore: class {}},
        [mockPath('clipboard.js')]: {ClipboardMonitor: class {}},
        [mockPath('paste.js')]: {PasteBackend: class {}},
        [mockPath('popup.js')]: {SuperVPopup: class {}},
    };
    const module = await loadModule('extension/extension.js', mocks);
    const c = new module.default();
    c._active = true;
    c._epoch = 1;
    c._selectionEpoch = 0;
    c._stateRevision = 0;
    c._ready = true;
    c._target = {};
    c.history = new History();
    c.emoji = new EmojiIndex(emoji.emoji);
    c.settings = {get_boolean: () => true};
    c.store = {save() {}, erase() {}};
    c.popup = {close() {}, refresh() {}};
    const writes = [];
    const pastes = [];
    c.clipboard = {generation: 1, readText: async () => 'old', write: x => writes.push(x)};
    c.pasteBackend = {paste: x => pastes.push(x)};
    return {c, writes, pastes};
}
test('emoji retains prior text in memory and supports guarded explicit restore', async () => {
    const {c, writes} = await controller();
    await c.select({text: '😀'}, true);
    assert.equal(c.pendingRestore.previous, 'old');
    assert.deepEqual(writes, ['😀']);
    assert.equal(c.history.entries.length, 0);
    c.clipboard.readText = async () => '😀';
    await c.restoreClipboard();
    assert.deepEqual(writes, ['😀', 'old']);
    assert.equal(c.pendingRestore, null);
});
test('restore never overwrites a newer clipboard', async () => {
    const {c, writes} = await controller();
    c.pendingRestore = {previous: 'old', emoji: '😀'};
    c.clipboard.readText = async () => 'new';
    await c.restoreClipboard();
    assert.deepEqual(writes, []);
});
test('clipboard changes during emoji snapshot abort insertion', async () => {
    const {c, writes, pastes} = await controller();
    c.clipboard.readText = async () => { c.clipboard.generation++; return 'old'; };
    await c.select({text: '😀'}, true);
    assert.deepEqual(writes, []);
    assert.deepEqual(pastes, []);
});
test('reopening panel while emoji read waits aborts stale selection', async () => {
    const {c, writes} = await controller();
    c.clipboard.readText = async () => { c._selectionEpoch++; return 'old'; };
    await c.select({text: '😀'}, true);
    assert.deepEqual(writes, []);
});
test('disable during emoji snapshot aborts insertion', async () => {
    const {c, writes} = await controller();
    c.clipboard.readText = async () => { c._active = false; return 'old'; };
    await c.select({text: '😀'}, true);
    assert.deepEqual(writes, []);
});
test('history choice promotes selected entry and clears old restoration', async () => {
    const {c, writes, pastes} = await controller();
    c.history.add('A');
    c.history.add('B');
    c.pendingRestore = {previous: 'old', emoji: '😀'};
    await c.select(c.history.entries[1], false);
    assert.equal(c.history.entries[0].text, 'A');
    assert.equal(c.pendingRestore, null);
    assert.deepEqual(writes, ['A']);
    assert.equal(pastes[0], c._target);
});
