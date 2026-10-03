Super V Ubuntu 0.1.6 adds image clipboard history, native screenshots, and a
setting to clear history on shutdown.

- PNG/JPEG clipboard images appear alongside text with thumbnails, dimensions,
  pin/delete controls and paste support. Limits are 8 MiB per image, 32 MiB
  total, 8192 pixels per side and 16 megapixels. Apps must accept image paste.
- The camera button and configurable Super+Shift+S shortcut open GNOME’s
  screenshot controls for area, window or screen capture. Captured PNG images
  enter history while capture is enabled. GNOME’s normal screenshot files are
  independent of Super V history.
- Settings → Clipboard history → Clear history on shutdown keeps text, images,
  pins and emoji recents only in memory. This also clears on restart, logout
  or extension reload. Turning it on removes existing saved history; current
  memory is retained. This overrides Remember after logout.
- Existing text history and settings are preserved when this new option is off.
  All new controls and notifications are translated in all seven languages.

Upgrade on your Ubuntu GNOME desktop:

```sh
sudo apt install ./super-v-ubuntu_0.1.6_all.deb
```

Log out and back in after upgrading, then verify the header reads **Super V
0.1.6**. Enable the extension as your ordinary user if needed:

```sh
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
```

A user-local copy with the same UUID overrides the system package. Inspect the
path with `gnome-extensions info super-v-ubuntu@super-v-ubuntu.local` if an old
version appears. Upgrades retain text history, pins and existing settings.

Release publication is gated on translation completeness, Node/GJS tests,
private image-storage checks, package audit/lintian, and real isolated GNOME
Wayland popup/preferences, image clipboard, image paste and screenshot tests.
Full desktop application acceptance remains the matrix in docs/testing.md.
