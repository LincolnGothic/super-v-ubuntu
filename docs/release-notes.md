Super V Ubuntu 0.1.4 adds seven-language support in one installer: English,
Simplified Chinese, Traditional Chinese, Japanese, Spanish, French and Korean.
The popup, settings, notifications and accessible labels follow the desktop
language; unsupported languages fall back to English.

Emoji search uses bundled Unicode CLDR 48 names and keywords in the selected
language. English names remain searchable. Kaomoji and symbol names are also
translated. Language selection does not change inserted glyphs, stored history,
pins, categories, skin tones or recents. No runtime downloads are needed.

The README includes installation and usage guides in all seven languages, with
upgrade/enable instructions and a translation contribution guide. GitHub's About
section now describes the project. The six-column emoji grid, near-pointer
placement, centered option, click-away dismissal and local GIF favorites remain.

Upgrade on your Ubuntu GNOME desktop:

```sh
sudo apt install ./super-v-ubuntu_0.1.4_all.deb
```

Log out and back in, then verify the header reads **Super V 0.1.4**. If necessary,
enable it as your ordinary user:

```sh
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
```

A user-local copy with the same UUID overrides the system package; inspect the
path with `gnome-extensions info super-v-ubuntu@super-v-ubuntu.local` if the old
version appears. Change the desktop language through Ubuntu's Region & Language
settings, then log out/in. Upgrades retain history and existing settings.

Release publication is gated on deterministic Unicode data, complete gettext
catalogs and format checks, syntax/metadata/schema checks, Node/GJS tests,
Debian package audit and lintian, plus actual popup/preferences rendering in
seven isolated GNOME Wayland sessions. Full clipboard/paste acceptance across
desktop applications remains the separate matrix in docs/testing.md.
