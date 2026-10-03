Super V Ubuntu 0.1.10 fixes unresponsive pinned-image controls and blocked captures.

The pin toolbar used to treat button presses as the start of a drag. This could
consume the release needed to activate Zoom, Copy, Opacity or Close. Toolbar
buttons now receive their complete clicks; only the image and empty header space
start dragging.

- Zoom in/out, Copy, Opacity and Close respond to real mouse clicks.
- New screenshots work with a reference image still pinned on the desktop.
- Starting capture releases any in-progress pin drag and pin keyboard focus.
- Escape during a pin drag closes that reference and releases input.
- Monitor changes and pin removal release drag input; cleanup dismisses the grab
  even if disconnecting the event handler fails.

The native Wayland regression uses physical pointer/keyboard events for all five
buttons, drag release/Escape, screenshot capture with a visible pin, and Close
after capture cancellation. Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50 and Debian
13/GNOME 48 on x86-64 and ARM64 gate publication. Four installers and SHA256SUMS
are provided. All seven interface languages remain available.

Install the package for your distribution with `sudo apt install ./PACKAGE.deb`,
then save your work, log out and back in. No uninstall is needed. GNOME keeps
previous JavaScript modules loaded until a new session starts. The header should
show **Super V 0.1.10**.

If a reference is already stuck before updating, disable and re-enable only
Super V with `gnome-extensions disable super-v-ubuntu@super-v-ubuntu.local` and
`gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local`. This removes
temporary screen references. History follows your persistence/clearing settings.
