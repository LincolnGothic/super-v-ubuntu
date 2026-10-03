# v0.1.6 verification

Validated on 2026-10-03 with GNOME Shell 50.1 in isolated Wayland compositors.
All preview clipboard data, settings, state directories, screenshot files and
GTK paste destinations were disposable; no personal clipboard was sampled.

- Node: 160 logic and adapter tests pass, including PNG/JPEG bounds, mixed
  history, v1 migration, deduplication/pins, privacy changes, stale reads,
  original image bytes/MIME, and literal multi-argument message formatting.
- GJS/Gio: 35 checks pass, including native PNG/JPEG decoding/thumbnails,
  private directory/file modes, checksum/symlink rejection, image cleanup,
  erasure after in-flight writes and empty fresh session-only state.
- Gettext: 280 messages in six complete additional-language catalogs, with
  English fallback; 17 actual regional lookup checks pass.
- Native GNOME/GTK: 60 checks in each of English, Simplified Chinese,
  Traditional Chinese, Japanese, Spanish, French and Korean (420 total).
  These include real Mutter PNG/JPEG clipboard transfers, image paste into
  the original GTK window, visible dimensions in single and multiple image
  rows, camera-button capture, the actual Super+Shift+S binding, cancellation,
  screenshot-to-history capture, persisted image/text reload, memory-only
  history clearing, native settings bindings and live language switching.
- The package build invokes metadata/schema/syntax, generation, translation,
  lint, Node and GJS checks. The package audit verifies runtime files, schemas,
  version, compatibility dependencies, ownership and modes.

The screenshot API was also inspected in GNOME's tagged
[46.0 source](https://github.com/GNOME/gnome-shell/blob/46.0/js/ui/screenshot.js)
and the installed 50.1 resource: Main.screenshotUI.open() opens the native
capture overlay and its screenshot path publishes image/png clipboard bytes.
CI repeats the package/lintian checks and the native GUI suite on Ubuntu 24.04
with GNOME 46 before release publication.

These results cover the isolated GTK receiving application, not every image
editor, browser, messenger or clipboard manager. Full desktop, HiDPI,
multi-monitor, actual power-off and application acceptance remains the
procedure in testing.md. Memory-only storage supplies the shutdown behavior;
the user's computer was not powered off for validation. Independent GNOME
screenshot files are deliberately outside Super V history erasure.
