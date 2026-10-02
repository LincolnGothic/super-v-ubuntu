# Testing and desktop acceptance

`make test` checks metadata, JS syntax, strict GSettings compilation, exact
emoji generation, ESLint, Node logic/adapter tests, and GJS/Gio filesystem
integration. Mock adapter tests exercise the actual asynchronous controller
and clipboard modules, but do not prove Mutter clipboard, shell rendering or
input delivery works on a real desktop. CI builds the `.deb` and checks it
without an interactive shell. See `verification.md` for executed results.

## Package checks

```sh
make package
lintian --fail-on error,warning ../super-v-ubuntu_0.1.1_all.deb
dpkg-deb --info ../super-v-ubuntu_0.1.1_all.deb
dpkg-deb --contents ../super-v-ubuntu_0.1.1_all.deb
python3 scripts/audit-package.py ../super-v-ubuntu_0.1.1_all.deb
```

The archive must contain runtime files and compiled schemas only beneath
`/usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local`, plus
documentation under `/usr/share/doc/super-v-ubuntu`. No user files or maintainer
scripts changing user settings belong in it.

## Manual GUI procedure — NOT TESTED in the build workspace

Run this matrix on Ubuntu 24.04 / GNOME 46 and Ubuntu 26.04 / GNOME 50,
using Wayland and preferably a disposable user account.
Install `gnome-text-editor`, `gnome-terminal` and `firefox` if absent. Remove
any user-local copy of this UUID before testing the system package, keeping
a backup if it contains local changes.

```sh
gnome-shell --version
printf '%s\n' "$XDG_SESSION_TYPE"
sudo apt install ./super-v-ubuntu_0.1.1_all.deb
```

Log out/in, then enable and inspect it as your desktop user:

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
gnome-extensions prefs super-v-ubuntu@super-v-ubuntu.local
```

This reserves Super+V while leaving the notification list on Super+M.
Record any custom notification bindings first; the command replaces them.

1. Ensure capture, persistence and automatic paste are enabled. Open GNOME
   Text Editor, type separate A/B/C lines, and copy A, then B, then C with
   Ctrl+C. Press Super+V. Expect C, B, A, newest first, with immediate search
   focus. Use Up/Down and Enter to select A. Expect A inserted at the editor's
   cursor and the popup closed. Repeat with mouse selection.
2. Copy multiline Unicode text, including `你好 👩🏽‍🔬`, and verify the complete
   pasted text, original line endings and whitespace. Copy a duplicate and
   confirm one entry with refreshed recency. Test a 20 KiB copy: it should be
   ignored, not silently truncated.
3. Pin A, clear ordinary history, and verify A remains. Delete another item
   with Delete and with its mouse button. Lower the history limit, then copy
   enough entries to trigger trimming. Verify pins survive. Use preferences
   to clear all and verify pins and recents disappear.
4. Search a history term, try no-match text, press Ctrl+F, switch tabs with
   Ctrl+Tab, and press Escape. Verify click-outside closes and Tab can focus
   pin/delete/settings controls. Reopen and verify search resets.
5. Add and pin entries, disable/re-enable the extension, and verify persistence.
   Then log out/in and repeat. Turn off persistence, confirm the state file
   disappears, and log out/in: no history/recents should return. Pause capture
   and copy more text: existing history remains, new copies do not appear.
6. In Emoji, search `scientist` or `DNA`, choose categories and skin tones,
   and insert an emoji in the editor. Verify recents and no temporary emoji
   history pollution. Reopen and restore the prior clipboard after paste has
   completed. Copy a different value before restore and verify it is preserved.
   Check missing glyphs separately from insertion failures.
7. Repeat history and emoji insertion in GNOME Terminal, expecting
   Ctrl+Shift+V. Use harmless text such as `example` without newline. Do not
   use commands for this test. Repeat in Firefox's address bar and a normal
   editable field, expecting Ctrl+V. Test a per-app `manual` override and a
   `shift-insert` override in a suitable application.
8. Hold Super longer than 600 ms after choosing an item, close the destination
   while the panel is open, and switch focus immediately after selection.
   Confirm fallback copies without pasting into an unrelated application.
   Verify no stuck virtual Ctrl/Shift keys after repeated use/disable.
9. Test with a password manager that advertises a sensitive MIME hint and
   with an explicitly excluded app. Confirm capture does not occur. Also
   verify the documented limitation for copies whose origin cannot be known.
10. Lock/unlock with the popup open; no clipboard panel should be usable on
    the lock screen. Verify re-enable and preference changes do not show stale
    entries or cause shell exceptions. Test light/dark themes, 100%/200% scale,
    multiple monitors, long previews, scrolling beyond 60 results and keyboard
    navigation through incrementally rendered results.

Check permissions and shell logs after the matrix:

```sh
stat -c '%a %n' "${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu" \
    "${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu/history.json"
journalctl --user -b -o cat | rg 'super-v-ubuntu|Super V|JS ERROR'
```

Expect 700 and 600 when persistence is enabled. Redact clipboard content from
any unrelated logs before sharing. Record PASS/FAIL/NOT TESTED for each action
and application, exact versions, rendering issues and shell exceptions. On
Wayland use logout/login for code reload; do not use Alt+F2 `r`. A nested shell
is optional for developer iteration, but still test actual applications and
the user's normal session before declaring desktop support.
