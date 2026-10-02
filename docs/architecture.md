# Architecture

Super V Ubuntu runs as a GNOME Shell 46/50 ES-module extension. It adds one
user-mode keybinding and a reusable, compact St/Clutter shell dialog. There is
no application window, daemon, Electron runtime, X11 automation, or runtime
network access. The Debian package installs it at
`/usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local/`.
Users explicitly enable it; package scripts never change user settings.

`core/history.js`, `core/emoji.js`, `core/settings.js`, and `core/paste.js` are
platform-independent modules exercised under Node and GJS. `clipboard.js`
listens to Mutter's `Meta.Selection::owner-changed`, transfers only text with
a byte bound, rejects advertised password-manager MIME types, and prevents
stale asynchronous reads from entering history. Focus-based exclusions are
best effort, not reliable clipboard-origin identification.

`storage.js` uses Gio asynchronous file operations. Data lives in
`${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu/history.json` with directory
mode 0700 and file mode 0600. No backup file is retained. Malformed state is
deleted instead of logging clipboard contents. Writes are serialized and
coalesced, with deletion ordered after pending writes when persistence is
disabled. Memory and disk loads have limits. Privacy changes invalidate reads.

`paste.js` creates a Mutter/Clutter virtual keyboard, returns focus, waits for
physical shortcut modifiers to be released, rechecks the exact destination,
and emits Ctrl+V or a configured terminal shortcut. Failure leaves the chosen
text on the clipboard for manual paste. It never injects text into a different
focused window. Key release and disable cleanup are mandatory.

Emoji insertion uses the clipboard. The previous plain text is held only in
memory, and the user can explicitly restore it on the next opening if the
clipboard still contains the emoji. There is no arbitrary restoration timer:
Wayland does not tell this extension when a paste consumer has finished.
Nontext clipboard formats cannot be restored and are not saved. Temporary
emoji and restoration writes are suppressed from history.

`popup.js` handles search, keyboard selection, tabs, categories, tone variants,
pin/delete controls, bounded incremental results, and accessible labels. The
panel inherits GNOME theme classes; CSS specifies geometry, not fixed colors.
`prefs.js` runs separately in the GTK4/libadwaita preferences process. The shell
extension is active only in the normal user session, never at the lock screen.

The bundled Emoji 17.0 dataset is generated deterministically from Unicode's
fully-qualified emoji test records and English CLDR 48 annotations. Its inputs,
hashes, generator, and Unicode license are included. Build, test and operation
are offline; refreshing upstream data is an explicit developer action.

GNOME 46 and 50 are declared in metadata. Tagged source API inspection is
recorded in `docs/api-audit.md`. `shell-compat.js` selects current orientation,
stage event-actor and backend APIs when available, with GNOME 46 fallbacks.
It also normalizes the unfocused stage returned by older Shell versions.
These checks do not establish GUI compatibility:
real GNOME Wayland runtime validation is still required before claiming tested
desktop support. New versions must undergo an API audit and desktop testing.
