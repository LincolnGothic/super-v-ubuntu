# v0.1.10 verification

Local review on 2026-10-03, Ubuntu 26.04.1 / GNOME 50.1 / amd64.

## Reproduction and cause

The installed v0.1.9 was active on the reported desktop. Disabling and re-enabling
only Super V removed its temporary overlays; the user confirmed the stuck image
disappeared. No clipboard clearing request or other extension change was made.

An isolated native Wayland reproduction replaced `emit('clicked')` with a virtual
pointer press/release on the real Zoom in button. The old implementation failed
the zoom assertion. The parent toolbar's press handler started a drag on button
events and grabbed the pin, interfering with the button's own activation.

The fix checks the actual event actor with the GNOME-version-compatible helper.
Button descendants propagate their input normally; the image and empty header
space remain draggable. Capture releases pin drag input and pin keyboard focus.
Drag cleanup resets tracking before disconnecting, and dismisses its input grab
in a finally block. Escape during a drag and monitor changes also release input.

## Executed local checks

- The original native reproduction failed with the unchanged runtime.
- Real pointer clicks now activate Zoom in, Zoom out, all four opacity levels,
  Copy and Close. No drag grab or pressed button remains after a toolbar click.
- A physical image drag moves the reference and releases its grab on mouse-up.
- Actual Super+Shift+S opens a fresh selector with a pin visible and the toolbar
  focused; a manual drag finishes a PNG capture while preserving that reference.
- Escape during a drag closes the overlay and releases input. Starting capture
  during a drag releases input; after cancelling capture, Close still responds.
- The English native session also passes the existing 67 GTK editor checks,
  text input/caret placement, light mosaic, filter, OCR and clipboard checks.
- `make test` passes 191 Node tests, GJS integration, gettext/regional fallbacks,
  schema checks, lint and generated data. No new interface strings are needed.

All six Ubuntu 24.04 / Ubuntu 26.04 / Debian 13 × amd64 / arm64 native CI checks
must pass before merge/publication. Those jobs run seven interface languages,
lintian, package audits and apt install/removal. Published installers are checked
against GitHub asset digests and SHA256SUMS.

Physical multi-monitor/HiDPI hardware remains a manual acceptance check. Local
regressions run in a disposable compositor and do not inject input into the
user's desktop.
