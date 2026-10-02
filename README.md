# Super V Ubuntu

A local clipboard-history and emoji picker implemented as a GNOME Shell
extension. Press **Super+V** to open a compact shell popup, search immediately,
then select text or an emoji. GPL-3.0-or-later; Unicode data uses Unicode-3.0.

**Release status:** implementation and automated/package validation are
available. This build has **not** been exercised in a real GNOME Wayland
desktop. Do not interpret the target platform as a runtime support claim.
See `docs/verification.md` for the actual results, and `docs/testing.md` for
the desktop acceptance procedure.

## Target platform

Ubuntu 24.04 LTS / GNOME Shell 46 and Ubuntu 26.04 LTS / GNOME Shell 50,
using Wayland. APIs were inspected against tagged GNOME 46.0 and 50.1 sources.
Metadata and Debian dependencies allow these two Shell versions. GNOME 47–49,
51 and later, X11, and non-GNOME desktops are not declared supported.
Neither target has completed real desktop acceptance testing.
No `xdotool`, Electron, or background daemon is
used. GNOME extensions run inside the shell; use the desktop test procedure
before relying on this implementation.

## Screenshots

Pending real-desktop verification. Add actual light/dark and HiDPI screenshots
after the manual tests; no synthetic screenshot is presented as runtime proof.

## Install the Debian package

Download [`super-v-ubuntu_0.1.1_all.deb`](https://github.com/LincolnGothic/super-v-ubuntu/releases/download/v0.1.1/super-v-ubuntu_0.1.1_all.deb)
from [release v0.1.1](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.1),
save it to Downloads, then run on your Ubuntu desktop:

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.1_all.deb"
```

Log out and back in so GNOME discovers the system extension. Then, as your
ordinary user, without sudo:

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
gnome-extensions prefs super-v-ubuntu@super-v-ubuntu.local
```

GNOME normally assigns both Super+V and Super+M to notifications. The first
command leaves notifications on Super+M so Super+V can open this extension.
It replaces any custom notification shortcut. To restore GNOME's defaults,
run `gsettings reset org.gnome.shell.keybindings toggle-message-tray` after
disabling this extension.

Press Super+V. Capture begins after extension initialization, with a default
100-entry limit and persistent history. Change preferences to pause capture,
disable persistence or automatic paste, and choose another shortcut.
Enabling this extension grants it access to clipboard text; read `SECURITY.md`.

## Clipboard

Copied plain text appears newest first. Exact duplicates move to the front
without losing their pin. Unicode and multiline contents are preserved; the
popup uses short, single-line previews, while the full text is restored to the
clipboard. Search matches normalized, case-insensitive terms. History never
transmits data. Text over 16 KiB is ignored rather than truncated. Ordinary
history defaults to 100 entries (configurable 1–500); up to 100 pins survive
ordinary trimming and **Clear unpinned**. A total 2 MiB text budget may trim
ordinary entries earlier than their count limit.

Use Up/Down to select, Enter to paste, Delete to remove the selected entry,
Escape to close, Ctrl+F to focus search, and Ctrl+Tab to switch Clipboard/Emoji.
Tab navigates controls; the pin and delete buttons have accessible labels.
Mouse selection is supported. Preferences can erase pins and emoji recents too.
Clear requests made while disabled are applied on the next enable.

Automatic paste returns focus and sends a virtual-keyboard shortcut. Ctrl+V is
the default; recognized terminal IDs use Ctrl+Shift+V. Configure exact IDs/WM
classes under **Apps using Ctrl+Shift+V**, or set **Paste overrides**, for example:

```json
{"kitty":"ctrl-shift-v","some.editor.desktop":"shift-insert","special.app":"manual"}
```

Allowed values are `ctrl-v`, `ctrl-shift-v`, `shift-insert`, and `manual`. If
the destination disappears, focus changes, physical modifiers stay held, or
injection fails, the item remains on the clipboard for manual paste. The
extension cannot verify that a receiving application accepted the text.

## Emoji

The bundled database contains 3,944 fully-qualified Emoji 17.0 sequences,
including ZWJ, flags and skin-tone combinations, with English CLDR 48 keywords.
Search by name, keyword or emoji. The Category control cycles through All,
Recent, and Unicode groups; Tone cycles through all/default and five tones.
All includes mixed-tone sequences; individual tones match uniform variants.
Recents are capped at 30 and follow the persistence preference.

Emoji insertion saves the previous bounded plain-text clipboard in memory,
copies the emoji, and sends the configured paste shortcut. Reopen the popup
and choose **Restore clipboard** after paste has finished if you want the old
text back. Restoration only happens if the clipboard still contains that
emoji; newer copies are preserved. There is no timed restoration, since a
Wayland paste consumer provides no reliable completion acknowledgment here.
Images, rich-text formats, oversized text and password-marked clipboard data
are not snapshotted. Temporary emoji and restore writes do not enter history.
New emoji may appear as missing glyphs with older installed emoji fonts.
The database is complete even where the system font cannot render a sequence.

## Privacy

Everything stays local. There is no telemetry, synchronization, analytics,
logging of copied text, or runtime network access. Persistent state is
plaintext at `${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu/history.json`,
with 0700 directory/0600 file modes. Common password-manager MIME hints are
rejected; focused-app exclusions are best effort because Mutter does not
provide reliable origin identities for every copy. Private browsing and
password fields without a hint are not automatically detected. See `SECURITY.md`
for exact erasure steps and limitations.

## Build and development

On Ubuntu 24.04:

```sh
sudo apt install debhelper libglib2.0-bin nodejs python3 eslint gjs \
    gir1.2-gtk-4.0 gir1.2-adw-1 lintian git gh
make test
make package
lintian --fail-on error,warning ../super-v-ubuntu_0.1.1_all.deb
```

No npm dependencies or runtime downloads are required. Debian's build invokes
the checks, ESLint, Node tests and GJS integration tests itself. `make package`
uses debhelper/dpkg-buildpackage and writes the `.deb` into the parent directory.
`make install-local` installs just the runtime extension for your current user;
run it without sudo, log out/in, then enable the UUID as above. This user copy
takes precedence over a system copy, so remove it when testing the `.deb`.
See `docs/development.md`, `docs/architecture.md` and `CONTRIBUTING.md`.

## Troubleshooting

First inspect version, session and extension state:

```sh
gnome-shell --version
printf '%s\n' "$XDG_SESSION_TYPE"
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
journalctl --user -b -o cat | rg 'super-v-ubuntu|Super V|JS ERROR'
```

If the extension was newly installed or its code changed, log out/in on Wayland.
Alt+F2 then `r` does not restart a Wayland shell. A shortcut conflict may require
changing the GTK accelerator in preferences, e.g. `<Control><Alt>v`. GNOME's
extension system cannot always detect another program claiming the same key.
If a terminal does not paste, add its identifier or select a paste override.
If capture is missing, check capture/exclusion settings and the 16 KiB limit.
Corrupt state is erased with a generic notification, without copying it into
logs or retaining backups. Report shell errors with clipboard content redacted.

## Uninstall

```sh
gnome-extensions disable super-v-ubuntu@super-v-ubuntu.local
sudo apt remove super-v-ubuntu
```

Uninstalling does not remove user history. To erase it, follow `SECURITY.md`.
For a user-installed copy, disable it first and remove only its UUID directory:

```sh
rm -rf -- "${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local"
```

## Publish

GitHub Actions validates and builds each main-branch push. After these checks
pass, the release job publishes the package and `SHA256SUMS` for the version
in `package.json`, then downloads them again to verify the checksum. Existing
versioned releases are left unchanged. Pull requests do not publish releases.
The release job alone has repository contents-write permission; the build
job uses read-only permission. See the repository's Actions page for actual
run results. The dated record in `docs/verification.md` describes local checks
performed before initial publication, not current GitHub publication status.

This checkout includes `scripts/publish.sh`. After committing on main, run
`gh auth login`, then `./scripts/publish.sh`. It creates a PUBLIC
`<authenticated-account>/super-v-ubuntu` repository, pushes source, waits for
successful CI, builds from a clean checkout, checks lintian, creates `v0.1.1`,
uploads the `.deb` and SHA256SUMS, and downloads the release asset to verify it.
It refuses a different origin or an existing private repository. Actual remote
publication is recorded separately from local build success.
