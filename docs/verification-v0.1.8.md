# v0.1.8 verification

Local checks performed on 2026-10-03, Ubuntu 26.04.1 / GNOME 50.1 / amd64.

- `make test`: 189 Node tests passed, plus native GJS integration, schema checks,
  generated Unicode data checks, 341 complete messages per additional language,
  and 17 real gettext/regional fallback checks.
- `make package`: passed and generated the architecture-independent v0.1.8 installer.
- All three distribution variants passed archive, dependency, ownership, mode,
  translation and schema audits. Lintian runs on CI; it is not installed locally.
- Isolated GNOME 50.1 Wayland sessions passed all seven interface languages.
  Each included 48 native GTK editor checks and physical pin dragging, zoom,
  opacity, Copy, source removal, native screenshot/editor/clipboard/paste checks.
- Local Tesseract 5.5 recognized synthetic English, Simplified/Traditional Chinese,
  Japanese, Korean, Spanish and French text through anonymous pipes.
  Process cancellation, timeout, output bounds, and pipe byte integrity passed.
  Native editor termination killed a deliberately slow OCR child without copying
  its cancelled result. Empty automatic segmentation retries a text block within
  the same overall 30-second deadline.
- Annotation selection/move/resize/delete preserved later marks; undo restored
  deletion. Numbered markers rendered, and exports retained crop/opaque covers.
- UTF-8 text framing passed native GJS split-code-point and Node bridge checks.
- Preferences validated filename patterns, reset export choices, persisted OCR
  language, and switched all seven interface languages immediately.
- ESLint 6 and the flat configuration for ESLint 9 were checked locally.

The native CI matrix must also pass Ubuntu 24.04, Ubuntu 26.04, and Debian 13 on
amd64 and arm64 before release publication. Results and run links will be added
when those runs finish. CI also audits installers with lintian and verifies apt
installation/removal. Release assets are downloaded and checksum-verified.

Interactive hardware, multiple physical monitors, all target applications, and
OCR accuracy on arbitrary multilingual documents remain manual acceptance tests.
The screen capture shown in the README contains only the private test desktop.
