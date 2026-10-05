Super V Ubuntu 0.1.13 preserves transient desktop content in screenshots and expands image clipboard compatibility.

Super+Shift+S now freezes the desktop before opening the fresh crosshair selector.
Select and export from the same snapshot, retaining notifications and menus even
if they disappear from the live desktop. Escape cancels without replacing the
clipboard; clear, lock, disable and another capture cancel stale work.

Image history recognizes PNG/JPEG MIME aliases and actual image bytes when an app
mislabels the format. If one offered image transfer fails, it tries another.
Supported BMP/WebP data is converted to PNG. A single copied local image file can
be imported from URI-list or GNOME file clipboard offers. Image size limits,
password hints, history pause, app exclusions and cancellation still apply.
Remote links and file collections are not imported. WebP needs a system decoder.

The reported source was QQ’s Copy image. Native tests cover JPEG advertised as
PNG, bitmap import, local file offers, and the exact exported color of an element
that disappears during screenshot selection. The exact QQ application workflow
still requires desktop acceptance.

Local checks pass: 206 Node tests, 44 GJS checks, 17 Gettext/regional checks, and
isolated GNOME Shell 50.1 Wayland sessions in all seven interface languages.
Publication requires all six Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50 and
Debian 13/GNOME 48 jobs across x86-64 and ARM64, including lintian and package
installation/removal checks.

Download your distribution’s package and install with `sudo apt install ./PACKAGE.deb`.
No uninstall is needed. Save your work, log out and back in so GNOME loads the new
modules. Super+V should show **Super V 0.1.13** (extension version 14). Copy the
image again after upgrading. See the upgrade guide if a user-local copy overrides
the system extension.
