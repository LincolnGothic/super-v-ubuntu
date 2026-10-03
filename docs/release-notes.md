Super V Ubuntu 0.1.5 adds a language selector and Windows-style horizontal
category bars.

Open **Super+V → Settings → Appearance → Language** to choose English,
Simplified Chinese, Traditional Chinese, Japanese, Spanish, French or Korean.
The default is **Follow system**. The interface, preferences and localized search
update without logging out; the choice applies only to Super V. Language names
always appear in their native form so you can easily switch back.

Emoji categories now have directly selectable icons, translated tooltips and a
selected highlight in a single horizontal row. Scroll or use the arrow buttons
to reach additional categories. Left/Right and Home/End navigate the focused
category bar; Enter selects a category and Down moves into the grid. Kaomoji and
symbols use the same arrangement with category labels. A compact hand button
opens a menu for choosing a skin tone directly.

Upgrade on your Ubuntu GNOME desktop:

```sh
sudo apt install ./super-v-ubuntu_0.1.5_all.deb
```

Log out and back in after upgrading, then verify the header reads **Super V
0.1.5**. If necessary, enable the extension as your ordinary user:

```sh
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
```

A user-local copy with the same UUID overrides the system package; inspect the
path with `gnome-extensions info super-v-ubuntu@super-v-ubuntu.local` if an old
version appears. Upgrades retain history and existing settings. Subsequent
changes to Super V's language do not need another logout.

Release publication is gated on deterministic Unicode data, complete translation
catalogs and format checks, syntax/metadata/schema checks, Node/GJS tests,
Debian package audit and lintian, plus real popup/preferences rendering and live
language switching in seven isolated GNOME Wayland sessions. Full clipboard/paste
acceptance across desktop applications remains the separate matrix in
docs/testing.md.
