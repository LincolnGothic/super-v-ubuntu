Super V Ubuntu 0.1.11 fixes clipped and misplaced Super+V popups.

The popup now measures its full layout, fits the scrollable results to the usable
monitor area, and positions itself after layout completes. Reopening or changing
tabs no longer reuses an old allocation that can push the title off-screen.

- The default **Near last click** position remembers the last primary click in
  the focused application, so moving the pointer away from its input field does
  not move the popup to an unrelated location.
- Moving that window preserves the relative point. Resizing it, switching to a
  window without a recorded click, or having no click uses the mouse pointer.
- Drag the title bar to reposition the popup. Its bounds stay inside the usable
  screen, and header buttons retain their normal click behavior.
- **Center of screen** remains available in Settings and uses the work area.
- Position tracking keeps just one window and point in memory. It does not save
  input text or keystrokes and is approximate rather than exact caret tracking.

Native Wayland regressions cover 720p work-area fitting, reopening all five tabs
at screen edges, larger text, title dragging, real header-button clicks, and
application click anchoring after moving the pointer away. Publication requires
Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50, and Debian 13/GNOME 48 on x86-64 and
ARM64. All seven interface languages are included.

Install the package for your distribution with `sudo apt install ./PACKAGE.deb`.
Then save your work, log out and back in. No uninstall is needed. GNOME keeps
previous JavaScript modules loaded until a new session starts. The header should
show **Super V 0.1.11** (extension version 12).
