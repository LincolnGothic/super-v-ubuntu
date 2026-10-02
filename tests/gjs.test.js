// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import System from 'system';
import {History} from '../extension/core/history.js';
import {EmojiIndex} from '../extension/core/emoji.js';
import {StateStore} from '../extension/storage.js';
import {GifLibrary} from '../extension/gifs.js';

let passed = 0;
function check(name, condition) {
    if (!condition)
        throw new Error(name);
    print(`PASS: ${name}`);
    passed++;
}

async function run() {
    const errors = [];
    const base = GLib.dir_make_tmp('super-v-tests-XXXXXX');
    const store = new StateStore(base, x => errors.push(x));
    const history = new History(2);
    history.add('你好\n👩🏽‍🔬');
    const a = history.add('A');
    history.togglePin(a.id);
    history.add('B');
    const raw = history.toJSON(['😀']);
    check('GJS Unicode/dedup/serialization', History.deserialize(raw).history.entries.length === 3);
    await store.save(raw);
    check('Gio private directory', store.directory.query_info('unix::mode',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null).get_attribute_uint32('unix::mode') % 512 === 0o700);
    check('Gio private file', store.file.query_info('unix::mode',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null).get_attribute_uint32('unix::mode') % 512 === 0o600);
    check('Gio asynchronous Unicode round trip', await store.load() === raw);
    const first = store.save('first');
    const last = store.save(raw);
    await Promise.all([first, last]);
    check('Gio coalesced writes preserve newest state', await store.load() === raw);
    const pending = store.save(raw);
    store.persist = false;
    await store.erase();
    await pending;
    check('Privacy erasure follows in-flight write', !store.file.query_exists(null));
    await store.save(raw);
    check('Persistence disabled cannot recreate state', !store.file.query_exists(null));
    store.persist = true;
    await store.save('broken-json');
    check('Malformed JSON recovers empty', History.deserialize(await store.load()).recovered);
    await store.erase();
    check('Erase absent file is harmless', await store.load() === null);
    const outside = Gio.File.new_for_path(GLib.build_filenamev([base, 'outside']));
    outside.replace_contents('do-not-touch', null, false, Gio.FileCreateFlags.PRIVATE, null);
    store.file.make_symbolic_link(outside.get_path(), null);
    check('Symlink state is rejected', await store.load() === null);
    check('Symlink recovery preserves target', new TextDecoder().decode(outside.load_contents(null)[1]) === 'do-not-touch');
    check('Invalid state generates generic warning', errors.length === 1 && !errors[0].includes('do-not-touch'));
    const [ok, key, mods] = Gtk.accelerator_parse('<Super>v');
    check('GTK4 shortcut API', ok && Gtk.accelerator_valid(key, mods));
    check('libadwaita preference APIs', typeof Adw.SpinRow.new_with_range === 'function' &&
        Boolean(Adw.SwitchRow) && Boolean(Adw.EntryRow) && Boolean(Adw.ComboRow));
    check('GTK4 GIF file chooser APIs', Boolean(Gtk.FileDialog) &&
        typeof Gtk.FileDialog.prototype.open_multiple === 'function' && Boolean(Gtk.StringList));
    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        GLib.build_filenamev([GLib.get_current_dir(), 'extension/schemas']),
        Gio.SettingsSchemaSource.get_default(), false);
    const settings = new Gio.Settings({settings_schema: schemaSource.lookup(
        'org.gnome.shell.extensions.super-v-ubuntu', true)});
    check('GSettings default shortcut and limit', settings.get_int('history-limit') === 100 &&
        settings.get_strv('open-popup')[0] === '<Super>v');
    check('GSettings rejects out-of-range limits', !settings.set_int('history-limit', 501));
    check('GSettings pointer position default', settings.get_string('popup-position') === 'pointer');
    check('GSettings center position option', settings.set_string('popup-position', 'center'));
    check('GSettings rejects unknown position', !settings.set_string('popup-position', 'unknown'));
    const gifFile = Gio.File.new_for_path(GLib.build_filenamev([base, 'wave.gif']));
    const gifBytes = GLib.base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
    gifFile.replace_contents(gifBytes, null, false, Gio.FileCreateFlags.PRIVATE, null);
    settings.set_strv('gif-files', [gifFile.get_path()]);
    const library = new GifLibrary(settings);
    check('GIF filename search', library.search('wave').length === 1 && library.search('missing').length === 0);
    check('Gio asynchronous GIF round trip', (await library.read(library.search()[0])).length === gifBytes.length);
    const gifLink = Gio.File.new_for_path(GLib.build_filenamev([base, 'link.gif']));
    gifLink.make_symbolic_link(gifFile.get_path(), null);
    let linkRejected = false;
    try { await library.read({path: gifLink.get_path()}); } catch { linkRejected = true; }
    check('GIF symlink is rejected', linkRejected);
    gifFile.replace_contents('invalid-gif', null, false, Gio.FileCreateFlags.PRIVATE, null);
    let invalidRejected = false;
    try { await library.read({path: gifFile.get_path()}); } catch { invalidRejected = true; }
    check('Invalid local GIF is rejected', invalidRejected);
    gifLink.delete(null);
    gifFile.delete(null);
    const file = Gio.File.new_for_path('extension/data/emoji.json');
    const data = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));
    const emoji = new EmojiIndex(data.emoji);
    check('GJS emoji search/skin tone', emoji.search('scientist', 'All', 'medium').some(x => x.text === '👩🏽‍🔬'));
    outside.delete(null);
    store.directory.delete(null);
    Gio.File.new_for_path(base).delete(null);
    print(`GJS checks: ${passed} passed, 0 failed`);
}

let status = 0;
const loop = new GLib.MainLoop(null, false);
run().catch(error => { print(`FAIL: ${error.message}\n${error.stack}`); status = 1; })
    .finally(() => loop.quit());
loop.run();
System.exit(status);
