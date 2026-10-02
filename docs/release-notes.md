Super V Ubuntu 0.1.2 changes the emoji picker to a Windows-style grid: six
large, centered emoji per row, fewer columns on narrow monitors, and clear
hover and selection highlighting. The final partial row keeps aligned columns.

Up/Down move between rows and focus the grid; Left/Right then move between
emoji. Enter inserts the selection and Ctrl+F returns to search, where
Left/Right still move the text cursor. Navigation loads additional results
and keeps the selected row visible. Search, categories, skin tones, recents
and accessible emoji names are preserved. Clipboard history keeps its text
rows, pin and delete controls.

Targets remain Ubuntu 24.04 LTS / GNOME Shell 46 and Ubuntu 26.04 LTS /
GNOME Shell 50, using Wayland. GNOME 47–49 and 51+ are not declared supported.
The bundled Emoji 17.0 database contains 3,944 fully-qualified sequences with
CLDR 48 English search keywords.

Validation includes automated tests, lint, schema/data checks, Debian package
build and audit. Actual grid rendering, equal columns, partial rows, pagination,
focus and scrolling were checked in an isolated GNOME Shell 50.1 Wayland session
with sample data. Full desktop clipboard/paste acceptance, GNOME 46 rendering,
light theme, HiDPI rendering and multiple monitors remain pending. See
docs/emoji-grid-verification.md and docs/testing.md for the scope of verification.

Download the attached package and upgrade with:

```sh
sudo apt install ./super-v-ubuntu_0.1.2_all.deb
```

Log out and back in to reload the extension on Wayland. Existing users do not
need to change their shortcut or enable the extension again. For a first
installation, follow the README and enable it as your ordinary user:

```sh
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
```

Read README and SECURITY.md before enabling clipboard capture. Known
limitations remain: text-only history, 16 KiB per entry and 2 MiB total,
best-effort password-origin identification, unverified paste reception,
explicit restoration of the prior plain-text clipboard, font-dependent emoji
glyphs and English annotations. No telemetry or runtime networking.

The release workflow publishes only after a successful build and package
audit, then downloads the installer and verifies it against SHA256SUMS.
