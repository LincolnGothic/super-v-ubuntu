// SPDX-License-Identifier: GPL-3.0-or-later
import {matchesApplication, parsePasteOverrides} from './settings.js';

export function choosePasteShortcut(identifiers, terminals, overrides = '{}') {
    const map = parsePasteOverrides(overrides);
    for (const name of identifiers) {
        if (Object.hasOwn(map, name.toLowerCase()))
            return map[name.toLowerCase()];
    }
    return matchesApplication(identifiers, terminals) ? 'ctrl-shift-v' : 'ctrl-v';
}

// This policy is tested independently of the GNOME virtual-keyboard adapter.
export function canPaste({enabled, targetExists, targetFocused, locked,
    modifiersHeld, shellFocused}) {
    return enabled && targetExists && targetFocused && !locked &&
        !modifiersHeld && !shellFocused;
}
