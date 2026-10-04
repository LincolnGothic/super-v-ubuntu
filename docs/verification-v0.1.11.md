# v0.1.11 verification

Local checks on Ubuntu 26.04.1 / GNOME 50.1 / amd64.

## Reproduction and cause

The reported computer was running v0.1.10, with pointer positioning selected.
In an isolated 1280×720 Wayland session, the unchanged popup measured 692 pixels
high against a 688-pixel work area, before its edge margins. The bounds assertion
failed. Reopening at a new pointer position could also retain the old placement
until switching tabs forced another allocation.

The styled panel has its own allocation inside GNOME's modal wrapper. Subtracting
only the wrapper's origin ignored that offset; positioning before completed
layout could also read stale bounds. The old fixed body budget did not account
for all header, footer, theme, and padding space.

The fix measures the complete panel, reduces the results viewport as needed,
converts the desired screen point into parent coordinates, and subtracts the
panel's allocation. A cancellable BEFORE_REDRAW callback applies placement after
layout. The panel becomes visible only once it is placed. Center mode uses the
usable work area, and dragging clamps to that same area.

Application events are consumed by Mutter before Shell stage handlers. Input
anchoring observes native window user-time notifications and remembers a point
only while the primary button is down and that window has the pointer. Window
closure and extension destruction disconnect all tracking; no polling timer,
input grab, text collection, or persistent positioning data is added.

## Executed local checks

- The unchanged 720p native reproduction failed its bounds assertion.
- The fixed 720p session reopens all five tabs at four anchors including screen
  edges. Each panel matches its expected placement and fits the full work area.
- Real pointer title drags move the panel, clamp at edges, and release on mouse-up.
  Tab and header buttons respond afterward; reopening resets manual placement.
- A real GTK application receives a primary click. After the pointer moves away,
  actual Super+V opens at the saved input point and preserves the paste target.
  PNG and JPEG image paste still reach the original application.
- All seven native interface-language sessions pass, each with 67 GTK editor
  checks, screenshot capture, screen pins, OCR, shutdown clearing, and session
  persistence checks. Larger inherited text retains the full panel bounds; real
  Settings and Screenshot clicks activate without beginning a title drag.
- `make test` passes 198 Node tests, 35 GJS checks, 17 Gettext/regional checks,
  lint, schema, generated data, and translation completeness.

Local universal and Ubuntu 26.04 packages pass file, translation, ownership,
version, architecture, and dependency audits. Local lintian is unavailable; CI
requires it for both universal and distribution packages.

The first pull-request matrix passed all six targets, but the merged release run
caught a larger-text timing failure on Ubuntu 24.04 ARM64. Fitting now waits for
the changed panel allocation instead of adding another BEFORE_REDRAW callback
while the old size is still current. The native larger-text check waits for full
bounds to settle rather than assuming a fixed 150ms layout interval. Center-mode
checks also wait for the final placement after a tab changes size. A Node
regression verifies that the stale size is not repeatedly fitted or shown.
The same release run exposed a procfs race in the OCR cancellation fixture:
Linux can report ESRCH while its process disappears. That check now confirms
the process has vanished or retries while it is still present; OCR runtime code
is unchanged.

CI gates merge/publication on all six distribution/CPU combinations. Every job
runs all seven interface languages, an additional English 1280×720 placement
regression, lintian, package audit, and apt install/removal. Release installers
must match their GitHub asset digests and SHA256SUMS.

The native acceptance fixture is GTK. Exact caret tracking across applications,
physical multi-monitor/HiDPI hardware, and the user's Codex composer remain
manual acceptance checks. Tests use a disposable compositor and never inject
input into the user's desktop.
