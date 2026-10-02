// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLimit, validateAppList, matchesApplication,
    parsePasteOverrides} from '../extension/core/settings.js';
import {canPaste, choosePasteShortcut} from '../extension/core/paste.js';

for (const value of [1, 100, 500])
    test(`valid history limit ${value}`, () => assert.equal(validateLimit(value), value));
for (const value of [0, -1, 501, 1.1, '100', null, NaN, Infinity])
    test(`invalid history limit ${value}`, () => assert.equal(validateLimit(value), 100));
test('application list validation and case-insensitive exact matches', () => {
    assert.deepEqual(validateAppList([' A ', 'a', '', null, '\0']), ['a']);
    assert.equal(matchesApplication(['KeePassXC'], ['keepassxc']), true);
    assert.equal(matchesApplication(['fake-keepassxc'], ['keepassxc']), false);
    assert.deepEqual(validateAppList(null), []);
});
test('paste overrides are validated and prototype-safe', () => {
    assert.deepEqual(parsePasteOverrides('{"App":"manual","bad":"sh -c anything"}'), {app: 'manual'});
    assert.deepEqual(parsePasteOverrides('[]'), {});
    assert.deepEqual(parsePasteOverrides('broken'), {});
    assert.equal(choosePasteShortcut(['__proto__'], [], '{"__proto__":"manual"}'), 'manual');
});
test('default and terminal paste shortcuts with per-app overrides', () => {
    assert.equal(choosePasteShortcut(['Firefox'], ['Gnome-terminal']), 'ctrl-v');
    assert.equal(choosePasteShortcut(['gnome-terminal'], ['Gnome-terminal']), 'ctrl-shift-v');
    assert.equal(choosePasteShortcut(['Gnome-terminal'], ['Gnome-terminal'],
        '{"gnome-terminal":"shift-insert"}'), 'shift-insert');
    assert.equal(choosePasteShortcut(['kitty'], ['kitty'], '{"kitty":"manual"}'), 'manual');
});
const safe = {enabled: true, targetExists: true, targetFocused: true,
    locked: false, modifiersHeld: false, shellFocused: false};
test('safe paste policy permits focused destination', () => assert.equal(canPaste(safe), true));
for (const [key, value] of Object.entries(safe))
    test(`paste policy blocks ${key} violation`, () => assert.equal(canPaste({...safe, [key]: !value}), false));
