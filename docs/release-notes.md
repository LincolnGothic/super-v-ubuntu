Super V Ubuntu 0.1.7 adds a local screenshot editor.

- Crop, arrows, rectangles, text, highlights, freehand drawing and opaque black
  covers, with undo/redo and zoom/pan.
- Copy a flattened PNG to the clipboard or save it to a chosen PNG file.
- Open automatically after screenshots taken through Super V, with an opt-out
  in Settings → Desktop integration → Edit after taking a screenshot.
- Edit PNG/JPEG images in history with the pencil button or Ctrl+E.
- All new controls are translated into all seven supported languages.

The original history image and GNOME screenshot file remain separate. Covering
pixels in an export does not delete those originals. Existing image bounds
apply: 8 MiB per input/export, 8192 pixels per side, 16 megapixels.
Pin-to-screen, OCR and scrolling capture are not included in this release.

Upgrade with `sudo apt install ./super-v-ubuntu_0.1.7_all.deb`, then save your
work, log out and log back in. The Super+V header should read **Super V 0.1.7**.
Language, shortcuts and saved history are preserved. A user-local extension
with the same UUID overrides the system package; see the README upgrade guide.

Publication is gated on logic/translation/native GJS checks, package audit and
lintian, and isolated GNOME Wayland editor, clipboard, capture and paste tests.
Full desktop application acceptance remains the matrix in docs/testing.md.
