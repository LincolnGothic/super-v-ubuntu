# v0.1.7 verification

Validated on 2026-10-03 on GNOME Shell 50.1 in disposable Wayland sessions.
Settings, clipboard items, files and GTK destinations were synthetic/private;
no personal clipboard was read and the normal desktop was not modified.

- 175 Node logic/adapter checks pass, including crop coordinates, undo/redo,
  annotation bounds, automatic-editor opt-out/cancellation, stale transfer
  rejection, image-history editing and process-exit/Copy ordering.
- 35 existing native GJS/Gio image/storage checks and 17 actual gettext regional
  lookups pass. All six additional-language catalogs contain 303 translations.
- Each of seven languages passes 24 native GTK editor checks: PNG/JPEG input,
  all drawing tools, multilingual text rendering, opaque exported pixels,
  cropping, Copy, Save to a private PNG, undo/redo and toolbar selection.
- The isolated Shell suite covers automatic editor opening after native capture,
  Copy through anonymous pipes with history paused, clipboard survival after
  natural editor exit, disabled automatic opening, capture cancellation, native
  image paste, preferences and persistence/privacy behavior.
- `make package` passes all build checks and produces version 0.1.7, architecture
  all. Package audit verifies new editor modules, schemas, languages, ownership,
  permissions and GNOME compatibility dependencies. CI repeats package/lintian
  and GUI tests on Ubuntu 24.04/GNOME 46 before publication.

Input and output use owned GLib byte buffers in pipe-sized async writes. The
full-screen capture test exercises transfers larger than a pipe buffer and
native decoding/export; the exit-order adapter test protects pending Copy
frames. No scratch image or edit project is stored.

Full physical desktop, HiDPI, multiple monitor and application acceptance remain
in testing.md. Black covers flatten pixels only in exports; original history
images, GNOME screenshot files and explicit saved exports remain separate.
Pin-to-screen, OCR and scrolling capture are outside this release.
