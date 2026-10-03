Super V Ubuntu 0.1.8 extends the screenshot editor and adds Debian 13 support.

- Pin edited images above application windows; drag, zoom, change opacity,
  copy, or close them. Up to five temporary pins are supported.
- Add automatically numbered markers for instructions and bug reports.
- Select existing annotations to move, resize, recolor, edit text, or delete
  one mark while preserving later annotations. Undo/redo remains available.
- Recognize image text locally with Tesseract, review the editable result,
  choose installed recognition languages, and copy text through Shell.
- Remember the last save folder and customize PNG filenames with
  {date}, {time}, {width}, and {height}; configure them in Settings.
- Include all new controls in English, Simplified Chinese, Traditional Chinese,
  Japanese, Spanish, French, and Korean.

Installers are provided for Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50,
and Debian 13/GNOME 48, plus one all-target installer. Each Architecture: all
package works on x86-64/amd64 and ARM64/AArch64 using native distribution
runtimes. All six platform/CPU combinations must pass native CI before release.
SHA256SUMS covers all four installers. See the README's platform table.

English OCR is installed automatically. Other languages require optional
Tesseract language packs; the README lists the apt command. OCR does not use
network services or scratch images. Pins and editor state are temporary and
close on lock, clear, or disable. Image bounds and private export permissions
remain unchanged. Original history images and GNOME screenshot files remain
separate from edited exports. Scrolling capture is not included.

Install the package for your distribution with `sudo apt install ./PACKAGE.deb`,
save your work, log out and back in, and check **Super V 0.1.8** in the header.
No uninstall is needed. Language, shortcuts, and saved history are preserved
unless your history-clearing preference requests otherwise. A user-local copy
of the same UUID takes precedence; see the upgrade guide.

The release is gated on logic, translation, GJS, package, lintian, installation,
removal, and isolated native Wayland editor/clipboard/OCR/pin tests. Interactive
application and hardware acceptance remains in docs/testing.md.
