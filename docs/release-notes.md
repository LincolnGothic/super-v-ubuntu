Super V Ubuntu 0.1.3 keeps the six-column, glyph-only emoji grid and adds
near-pointer placement (with a centered preference), reliable click-away
dismissal, and a visible loaded-version label. The picker also includes
searchable kaomoji, symbols, and local GIF favorites.

Click the input field, then press Super+V. In Settings, choose Picker position
for near-pointer or centered placement. Clicking an input alone does not open
the picker. Exact caret placement across all applications is unavailable;
near-pointer placement uses the mouse position when the shortcut is pressed.

Add local .gif files in Settings → GIF favorites. The panel previews the first
frame and copies the original image/gif bytes. The destination must accept
images, and animation support varies. Up to 40 favorites are supported, each
at most 8 MiB and 2048 × 2048 pixels. No online GIF search or runtime networking.

The release workflow gates publication on syntax, metadata, strict schemas,
deterministic Unicode data, ESLint, 123 Node checks, 25 GJS checks, Debian
package build/audit and lintian. An isolated GNOME 46 Wayland automation job
also checks actual St grid layout, placement and outside mouse dismissal.
Full desktop capture/paste acceptance on GNOME 46 and 50 remains pending.

Upgrade on your Ubuntu desktop:

```sh
sudo apt install ./super-v-ubuntu_0.1.3_all.deb
```

Log out and back in. The header should read Super V 0.1.3. If it does not,
inspect `gnome-extensions info super-v-ubuntu@super-v-ubuntu.local`: a copy in
~/.local/share/gnome-shell/extensions overrides the system package. Back up and
move that UUID directory out of the extensions folder, then log out/in again.
History is retained by upgrades; settings and GIF paths stay local.
