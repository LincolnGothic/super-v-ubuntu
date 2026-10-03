# v0.1.9 verification

Local review performed on 2026-10-03, Ubuntu 26.04.1 / GNOME 50.1 / amd64.

## Requirements and evidence

| Requirement | Verified behavior |
| --- | --- |
| Text opens an input box immediately | The Text button reveals/focuses a native GTK entry on the canvas; the physical Wayland keyboard types into it. |
| Text has a caret and can move with clicks | Real mouse clicks move the draft to another source-image coordinate; subsequent typing appends `d` to `abc`, with caret position 4. The native screenshot shows the box and caret. |
| Finished text appears in the image | Enter commits exactly one text annotation and hides the entry. Copy/Save/Pin finish pending drafts; Unicode text renders through Pango. |
| Black-and-white filter | Native exported RGB channels become equal; undo restores original colors. Annotation colors remain independent. |
| Freehand mosaic and adjustable thickness | Native gestures retain the path, 128-pixel brush width and 24-pixel tile size. Model validation allows widths 1–256 and tiles 4–64; invalid values are rejected. |
| Light gray/white mosaic | Native exports contain distinct opaque neutral tiles, all channels at least 224; pixels outside the brush stay unchanged. A native-rendered example is included in Screenshots. |
| No previous screenshot rectangle | Each capture constructs a new GNOME SelectArea with a hidden rubberband and unset start coordinates. Two real drags and the actual shortcut verify fresh selection, clipboard/history capture and optional editor opening. |
| Cancel/lock/clear safety | Native Escape adds no history entry; lifecycle checks reject stale capture callbacks and oversized selections before allocation. |

- `make test`: 191 Node tests, GJS integration, strict schemas, generated data,
  lint, 346 messages in six additional catalogs and 17 gettext/fallback checks.
- All seven languages passed an isolated native Wayland session with 61 GTK
  editor checks each, including real keyboard/mouse text interaction and capture.
- The final local English session passed 67 editor checks after adding mosaic
  gesture controls, switching from a large mosaic brush to text, draft cleanup, native filter/undo buttons and preservation of a draft at the annotation limit.
- Actual screen captures of the native editor/input were inspected. The mosaic
  example uses the same export renderer rather than a separate mockup.
- The package and native CI matrix require Ubuntu 24.04/GNOME 46, Debian 13/GNOME 48
  and Ubuntu 26.04/GNOME 50 on both amd64 and arm64 before merge/publication.
  Release publication downloads and verifies all four installers against SHA256SUMS.

## Review corrections

Native tests caught the GTK CSS provider method signature and a test click that
landed inside the entry, where a click correctly changes the text caret rather
than moving the annotation. The placement test now clicks an unoccupied image
location. The implementation preserves entry focus without selecting its text,
removes duplicate draft painting underneath the native entry, bounds input box
placement/font size, provides contrast for light text colors, and hides completed
drafts. Large mosaic widths do not become unexpected large text sizes.

The mosaic is a fully opaque light pattern, independent of source pixel colors.
Small repeating Cairo tiles keep rendering work bounded for large diagonal brush
paths. Undo snapshots hold state, not source pixel copies. Grayscale pixbufs use
a weak cache. Image, annotation, path, crop and export bounds remain enforced.
Capture uses an anonymous memory stream, waits for selector removal, validates
current epoch/serial before copying/storing/opening, and creates no extra raw file.

Physical multi-monitor/HiDPI hardware and every target application remain manual
acceptance checks in testing.md. OCR accuracy on arbitrary documents is unchanged.
All screenshots show only the disposable test desktop or synthetic fixture.
