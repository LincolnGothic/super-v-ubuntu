# Changelog

## Unreleased

- Allow Super+Shift+S to capture GNOME's Activities and Show Apps views, including when app search has keyboard focus.
- Add native keyboard, capture and cancellation checks for both Overview views.

## 0.1.13 — 2026-10-04

- Expand the About description with screenshots, annotations, screen pins and local OCR.
- Freeze the desktop when Super+Shift+S starts, before opening the crosshair selector. Select and export from the same snapshot, preserving transient notifications and menus.
- Read PNG/JPEG MIME aliases and try another offered image format if the first transfer fails. Convert supported BMP/WebP clipboard data to PNG.
- Import a single copied local PNG/JPEG/BMP/WebP file from URI-list or GNOME file clipb…7140 tokens truncated…d. Enabling it removes existing saved history, after pending writes finish,
while retaining the current session’s items in memory. It takes priority over
**Remember after logout**. Returning to persistent history requires disabling
this option and enabling Remember after logout.

## Emoji

The bundled database contains 3,944 fully-qualified Emoji 17.0 sequences,
including ZWJ, flags and skin-tone combinations, with CLDR 48 names and keywords in the six additional languages and English.
Search by name, keyword or emoji. Select All, Recent or a Unicode group directly
from the horizontal category bar; the hand button opens the skin-tone menu.
All includes mixed-tone sequences; individual tones match uniform variants.
Recents are capped at 30 and follow the persistence preference.

Emoji appear as large symbols in a six-column grid, with fewer columns on
narrow monitors. Up/Down move between rows and focus the grid; Left/Right
then move between emoji. Enter inserts the selected emoji, or click a tile.
Use Ctrl+F to return to search, where Left/Right still move the text cursor.
Emoji names remain available to screen readers. More results load as keyboard
selection passes the current page, or with **Show more**.

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

## Kaomoji, symbols and GIFs

The **;-)** tab contains text emoticons, and **Ω** contains math symbols, Greek
letters, arrows, currency, punctuation and units. Search by name or character,
choose a category, and click or press Enter to insert. Their grids use the same
keyboard navigation and guarded prior-text restoration as emoji.

In **Settings → GIF favorites**, choose local `.gif` files. The GIF tab previews
their first frame and searches filenames. Up to 40 favorites are supported;
each file must be at most 8 MiB with dimensions no larger than 2048 × 2048.
Files remain in their original location, so moving or deleting one requires
re-adding it. Removing a favorite does not delete the original file.

Choosing a GIF copies the original `image/gif` bytes and sends the normal paste
shortcut. The destination must accept images; some apps paste a still frame
or do not accept this format. GIF insertion replaces the clipboard without a
restore snapshot, and image data does not enter text history. There is no
online GIF search, account, API key or runtime network request.

## Privacy

Everything stays local. There is no telemetry, synchronization, analytics,
logging of clipboard contents, or runtime network access. Persistent state is
plaintext at `${XDG_STATE_HOME:-$HOME/.local/state}/super-v-ubuntu/history.json`,
with image files in its `images/` subdirectory and 0700 directory/0600 file modes. Common password-manager MIME hints are
rejected; focused-app exclusions are best effort because Mutter does not
provide reliable origin identities for every copy. Private browsing and
password fields without a hint are not automatically detected. See `SECURITY.md`
for exact erasure steps and limitations.

## Build and development

On Ubuntu 24.04:

```sh
sudo apt install build-essential debhelper libglib2.0-bin nodejs python3 gettext locales eslint gjs \
    gir1.2-gtk-4.0 gir1.2-adw-1 gir1.2-gdkpixbuf-2.0 lintian git gh
make test
make package
lintian --fail-on error,warning ../super-v-ubuntu_0.1.13_all.deb
```

No npm dependencies or runtime downloads are required. Debian's build invokes
the checks, ESLint, Node tests and GJS integration tests itself. `make package`
uses debhelper/dpkg-buildpackage and writes the `.deb` into the parent directory.
`make install-local` installs just the runtime extension for your current user;
run it without sudo, log out/in, then enable the UUID as above. This user copy
takes precedence over a system copy, so remove it when testing the `.deb`.
See `docs/development.md`, `docs/architecture.md` and `CONTRIBUTING.md`.

## Troubleshooting

**Super+V does not open:** check `gnome-extensions info` below. If the extension
is disabled, run `gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local`
without sudo. If Super+V opens notifications, run the notification-shortcut
command in [First installation](#install-the-debian-package); Super+M will still
open notifications.

**An old version or missing new settings:** follow the package, loaded-version,
and Path checks in [Upgrade](#upgrade-from-an-older-version). Save your work and
log out/in after an installation or upgrade.

**Cannot open Settings from the picker:** run
`gnome-extensions prefs super-v-ubuntu@super-v-ubuntu.local` without sudo.

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
If capture is missing, check capture/exclusion settings, the 16 KiB text limit and the image limits.
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

The owner can run `./scripts/publish.sh` from a clean main checkout with GitHub CLI
credentials. It pushes main, waits for the six native CI targets and automatic
release publication, then downloads all installers and verifies `SHA256SUMS`.
It refuses a different origin or an existing private repository.
