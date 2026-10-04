# v0.1.12 verification

## Reproduction and cause

The reported Ubuntu GNOME desktop had Super V 0.1.11 active, Super+V correctly
configured, and notifications assigned to Super+M. Screenshots still worked.
In an isolated GNOME Shell 50.1 Wayland session, repeated clipboard-popup opens
could reach the opened state while the styled panel retained opacity zero.
The BEFORE_REDRAW callback saw actors without valid allocations; reopening at
an unchanged size could finish layout without another allocation notification.

The fix schedules positioning after painting, retries after the next frame when
layout is incomplete or resized, and disconnects the callback on close or
destroy. Translation and opacity writes are skipped when already correct.

## Executed checks

- `make test`: 199 Node tests, GJS filesystem/image checks, 17 Gettext and regional
  checks, lint, schema compilation, and generated-data checks pass.
- The isolated GNOME Shell 50.1 Wayland suite passes, including the initial
  clipboard panel, three unchanged reopens, actual Super+V image paste,
  screenshots/editor, pins, OCR, larger text, placement, and persistence.
- A disposable synthetic-history probe checks empty, one-entry, and 90-entry
  histories, each reopened three times with the default and Yaru stylesheets.
  All 18 opens become visible; positioning completes once per open.
- The fix-only pull request CI passed all six supported distribution/CPU jobs.
  Each job runs all seven language sessions, an English 720p placement session,
  package audits, lintian, and package installation/removal.

The v0.1.12 release candidate repeats local package and native checks, and its
exact PR head must pass the complete CI matrix before merge. The merged commit
must pass the matrix again before the release workflow publishes installers and
verifies SHA256SUMS. The workflow remains the authoritative record for remote
checks and published assets.

Local lintian is unavailable; CI runs it on all targets. The full interactive
application, physical multi-monitor/HiDPI, and lock-screen matrix remains manual
acceptance, as described in `testing.md`. Tests use synthetic contents in a
private compositor; no personal clipboard data or desktop logs are published.
