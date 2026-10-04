Super V Ubuntu 0.1.12 fixes Super+V opening an invisible clipboard popup.

The shortcut could open the clipboard panel while it stayed fully transparent,
especially when reopening with unchanged contents. Its positioning callback ran
before Clutter finished layout, and an unchanged allocation could leave no later
notification to reveal the panel.

The popup now waits until painting completes before measuring, positioning, and
becoming visible. Layout changes retry on the next frame, and closing or destroying
the popup cancels pending callbacks. Work-area fitting, placement near the last
click, title-bar dragging, clipboard image paste, screenshots, the editor, screen
pins, and OCR remain available.

Regression checks verify a visible initial clipboard panel and three repeated
opens with unchanged contents. Native Wayland checks also cover screenshots,
image paste, screen pins, larger text, dragging, and popup placement. Publication
requires all six Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50, and Debian 13/GNOME 48
jobs across x86-64 and ARM64. All seven interface languages are included.

Download the package for your distribution and install it with
`sudo apt install ./PACKAGE.deb`. No uninstall is needed. Then save your work,
log out and back in so GNOME loads the new JavaScript modules. The header should
show **Super V 0.1.12** (extension version 13). A user-local copy of the same
extension UUID takes precedence over the system package; see the upgrade guide
if GNOME still reports an older version.
