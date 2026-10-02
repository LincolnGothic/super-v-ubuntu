// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {verticalBoxProperties, getEventActor, hasShellKeyFocus} from '../extension/shell-compat.js';

test('GNOME 50 boxes use orientation without the deprecated vertical property', () => {
    class BoxLayout { set_orientation() {} }
    assert.deepEqual(verticalBoxProperties(BoxLayout, {Orientation: {VERTICAL: 1}}), {orientation: 1});
});
test('GNOME 46 boxes use vertical without requiring the newer orientation API', () => {
    class BoxLayout {}
    assert.deepEqual(verticalBoxProperties(BoxLayout, {}), {vertical: true});
});
test('GNOME 50 outside-click lookup uses stage event actors', () => {
    const actor = {};
    const event = {get_source() { throw new Error('Legacy API must not be called'); }};
    assert.equal(getEventActor({get_event_actor: () => actor}, event), actor);
});
test('a missing GNOME 50 event actor remains null', () => {
    assert.equal(getEventActor({get_event_actor: () => null}, {}), null);
});
test('GNOME 46 outside-click lookup uses the event source', () => {
    const actor = {};
    assert.equal(getEventActor({}, {get_source: () => actor}), actor);
});
test('only an actual focused Shell actor delays paste', () => {
    const stage = {get_key_focus: () => null};
    assert.equal(hasShellKeyFocus(stage), false);
    stage.get_key_focus = () => stage;
    assert.equal(hasShellKeyFocus(stage), false);
    stage.get_key_focus = () => ({});
    assert.equal(hasShellKeyFocus(stage), true);
});
