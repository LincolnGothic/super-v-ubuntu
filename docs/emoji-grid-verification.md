# Emoji grid verification — 2026-10-02

The emoji picker now uses six columns at normal popup width and fewer columns
on narrow monitors. Clipboard history retains its list layout. The grid is
included in v0.1.2; the earlier v0.1.1 release asset does not include it.

## Automated checks

`make test` passes with Node 22.22.1: syntax, metadata, strict schema checks,
deterministic Unicode generation, ESLint, all six Node test files, and all
17 GJS integration checks. Ten new checks exercise grid grouping, incomplete
rows, narrow/HiDPI sizing, directional boundaries, focus and activation,
search-cursor keys, pagination, scroll-range timing, filtering, recents, and
the existing clipboard controls. St/Clutter adapters are mocked in Node.

The homogeneous row layout uses the existing `Clutter.BoxLayout` behind
`St.BoxLayout`. The setter is present in the upstream
[GNOME 46 header](https://github.com/GNOME/mutter/blob/46.0/clutter/clutter/clutter-box-layout.h)
and was exercised with GNOME Shell 50.1. No supported-version metadata changed.

## Isolated Shell rendering

An independent GNOME Shell 50.1 process ran with `--headless --wayland --no-x11`,
a 1280×960 virtual monitor, software rendering, a private D-Bus session,
temporary XDG directories and memory-backed settings. Its automation script
loaded the actual popup and stylesheet with an in-memory controller and the
bundled emoji database. No clipboard monitor or paste backend was started.

The following checks passed against real St actors:

- The popup opens; six emoji share the first row and the seventh starts the next.
- Column widths are equal, including a final row containing only two emoji.
- Moving right from result 60 loads the next 60 results and transfers focus.
- The newly selected row is fully visible after the scroll range updates.

The [screenshot](screenshots/emoji-grid.png) is from this run. It was visually
inspected for centered glyphs, spacing, six-column layout and visible focus.
The rendering check caught and verified a fix for scroll adjustment bounds
updating after row allocation. The regression is also covered by the Node test.

Full desktop capture/paste, screen readers, GNOME 46 rendering, light theme,
HiDPI rendering and multiple monitors remain pending in `testing.md`.
The local Debian build requires the missing `debhelper-compat` dependency;
the pull request's CI performs the package build and audit.
