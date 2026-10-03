# Architecture

Super V Ubuntu runs as a GNOME Shell 46/48/50 ES-module extension. It adds two
user-mode keybindings and a reusable, compact St/Clutter shell dialog. There is
a temporary GTK editor window, without a daemon, Electron runtime, X11 automation, or runtime
network access. The Debian package installs it at
`/usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local/`.
Users explicitly enable it; package scripts never change user settings.

`core/history.js`, `core/emoji.js`, `core/settings.js`, and `core/paste.js` are
platform-independent modules exercised under Node and GJS. `clipboard.js`
listens to Mutter's `Meta.Selection::owner-changed`, transfers text and PNG/JPEG images with
byte bounds, rejects advertised password-manager MIME types, and prevents
stale asynchronous reads from entering history. Focus-based exclusions are
best effort, not reliable clipboard-origin identification.

`storage.js` uses Gio asynchronous file operations. Data lives in
`${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu/history.json` with directory
mode 0700 and file mode 0600. Image records reference checked SHA-256 names
in an equally private images/ subdirectory; image bytes are never embedded in JSON. No backup file is retained. Malformed state is
deleted instead of logging clipboard contents. Writes are serialized and
coalesced, with deletion ordered after pending writes when persistence is
disabled. Memory and disk loads have limits. Privacy changes invalidate reads.
`images.js` checks image dimensions before native decoding, keeps bounded
thumbnails in memory, and deduplicates original bytes by digest. `core/image.js`
checks PNG/JPEG structure, size, dimensions, and stored metadata. Image writes
precede the JSON replacement; orphaned image files are removed after a save.
Deletion and persistence changes are ordered after pending image writes.
The clear-on-shutdown preference forces memory-only storage, avoiding reliance
on shutdown callbacks; no history can be restored after the session ends.
The Screenshot button and second keybinding release the picker’s modal grab
before opening Main.screenshotUI. The normal clipboard monitor captures its PNG.


`editor-bridge.js` launches one temporary GJS/GTK4 process, sending validated
image bytes on anonymous stdin and receiving bounded base64 PNG frames on stdout.
No scratch image, argument payload, clipboard log or network request is used.
The child exits when its window closes; clear, lock, deletion of the edited
entry and extension disable terminate it. Natural exit drains pending Copy
output before cleanup. Capture signal handlers and idle sources are removed
on cancellation; epoch/serial guards discard stale clipboard transfers.
`core/editor.js` stores original-coordinate annotations and crop bounds with
32 undo steps, 128 annotations, 4096 total stroke points and 500 text characters.
`editor-render.js` validates before native decode, uses Cairo/Pango for drawing,
and exports a flattened, bounded PNG. Black covers use opaque pixels. The
original is kept separate; the editor never rewrites history originals.
Copy goes through Shell's clipboard owner, so it remains available after the
editor closes. The automatic editor preference applies to Super V captures.

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
Stage and modal grab-root capture handlers dismiss outside clicks by visible
panel bounds; the stage connection ends with the popup's lifetime. Pointer placement clamps the allocated
panel against its monitor work area; a GSettings choice restores centering.
`core/catalog.js` provides authored text emoticons and symbols. `gifs.js` reads
local favorites asynchronously with a byte bound, rejects symlinks and invalid
GIF headers/dimensions, and copies GIF data with St.Clipboard's image/gif MIME.
Favorite paths live in GSettings; GIF favorites remain separate from PNG/JPEG history.
`prefs.js` runs separately in the GTK4/libadwaita preferences process. The shell
extension is active only in the normal user session, never at the lock screen.

The bundled Emoji 17.0 dataset is generated deterministically from Unicode's
fully-qualified emoji test records and English CLDR 48 annotations. Its inputs,
hashes, generator, and Unicode license are included. Build, test and operation
are offline; refreshing upstream data is an explicit developer action.

GNOME 46, 48 and 50 are declared in metadata. Tagged source API inspection is
recorded in `docs/api-audit.md`. `shell-compat.js` selects current orientation,
stage event-actor and backend APIs when available, with GNOME 46 fallbacks.
It also normalizes the unfocused stage returned by older Shell versions.
These checks do not establish GUI compatibility:
real GNOME Wayland runtime validation is still required before claiming tested
desktop support. New versions must undergo an API audit and desktop testing.


## Screenshot tools

The editor document stores stable annotation IDs and immutable undo snapshots.
Selection and transform commits replace only the selected ID; numbering is
assigned when adding markers. Cairo/Pango renders previews and flattened PNGs;
selection handles remain outside the export renderer. The pipe bridge validates
action-specific image/text frames and accumulates bytes before UTF-8 decoding.

`pins.js` keeps at most five Shell chrome overlays. `core/pins.js` limits compressed
inputs to 32 MiB and clamps geometry to work areas. Preview decoding downsizes to
1024×1024. Pins hold their original bytes only for Copy and are destroyed on lock,
clear, source deletion, or disable. Their drag grab and monitor signals are released.

`ocr.js` invokes native Tesseract through `process.js`: argv is fixed except a
validated installed language ID; PNG input and bounded UTF-8 output use pipes.
Recognition supports cancellation, 30-second timeouts, and 64 KiB output limits.
The OCR review buffer is temporary; explicit Copy writes through Shell so clipboard
ownership survives closing the GTK editor. Filename patterns and folder URIs are
GSettings preferences. Successful private exports remember their parent folder.
