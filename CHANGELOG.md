# Changelog

## 0.1.2 — 2026-10-02

Display emoji as large, centered tiles in a six-column grid instead of text
rows, reducing the column count on narrow monitors. Preserve accessible names,
search, categories, tones and recents. Add row/column arrow-key navigation,
keep the focused selection visible when loading more results, and preserve
Left/Right text editing in the search field. Clipboard history retains its
list layout and pin/delete controls.

## 0.1.1 — 2026-10-01

Add GNOME Shell 50 API compatibility for Ubuntu 26.04 Wayland, preserving the
GNOME 46 path. Use current widget orientation, stage event actors and stage
context backend lookup. Fix application paste when an older Shell returns
the stage as its unfocused actor. Add eight compatibility regression checks.
Metadata and Debian dependencies allow GNOME 46 and 50. Real desktop
acceptance remains pending on both targets.

## 0.1.0 — 2026-09-30

Initial GNOME 46 implementation: event-driven bounded clipboard capture,
newest-first deduplicated text history, search, pins, keyboard and mouse
selection, private local persistence, conservative focus-checked paste,
Unicode 17/CLDR 48 emoji categories/keywords/tones/recents, GTK4/libadwaita
preferences, GSettings, Debian packaging, offline automated tests and CI.

Real Wayland GUI tests and remote CI/release results remain unverified until
they are actually run. See the completion record in `docs/verification.md`.
