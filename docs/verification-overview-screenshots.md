# Overview screenshot shortcut verification — 2026-10-07

## Cause and change

The screenshot binding allowed NORMAL and POPUP input modes but omitted
OVERVIEW, which GNOME uses for Activities and Show Apps. The native regression
failed to open selection with the original binding. Adding OVERVIEW allows the
same screenshot workflow to capture the currently visible overview without
first hiding it. The clipboard picker binding and lock/greeter guards are kept.

## Executed local checks

- `make package` runs the full logic, GJS, translation, syntax, schema and lint
  checks and builds the Debian package. The package audit passes.
- An isolated GNOME Shell 50.1 Wayland regression uses actual Super+Shift+S,
  pointer drags and Escape in Show Apps and Activities, with search focused.
  Both views produce a PNG in history and the clipboard; cancellation preserves
  search and history. The focused English session reports no JavaScript errors.
- The test runner includes the focused regression in a fresh compositor for
  every configured language and monitor size, alongside the existing suite.
  Virtual keyboard input is advertised before Overview takes a modal grab;
  lazy app-grid loading finishes before the screenshot checks begin.

These use synthetic contents and disposable state, without changing the user's
desktop. Local lintian is unavailable. CI runs lintian and the native suites on
GNOME 46, 48 and 50, for amd64 and arm64; its results remain separate from local
GNOME 50 checks and manual desktop acceptance.
