// SPDX-License-Identifier: GPL-3.0-or-later
// Keep version-specific Shell API choices in one place, without GI imports.
export function verticalBoxProperties(BoxLayout, Clutter) {
    return typeof BoxLayout.prototype.set_orientation === 'function'
        ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};
}

export function horizontalBoxProperties(BoxLayout, Clutter) {
    return typeof BoxLayout.prototype.set_orientation === 'function'
        ? {orientation: Clutter.Orientation.HORIZONTAL} : {vertical: false};
}

export function getDefaultSeat(stage, Clutter) {
    const backend = stage.context
        ? stage.context.get_backend() : Clutter.get_default_backend();
    return backend.get_default_seat();
}

export function getEventActor(stage, event) {
    return typeof stage.get_event_actor === 'function'
        ? stage.get_event_actor(event) : event.get_source();
}

export function hasShellKeyFocus(stage) {
    const focus = stage.get_key_focus();
    // Before GNOME 48, an unfocused stage returned itself instead of null.
    return focus !== null && focus !== stage;
}
