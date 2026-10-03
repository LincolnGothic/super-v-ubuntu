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

## Native CI review

[The complete matrix run](https://github.com/LincolnGothic/super-v-ubuntu/actions/runs/37136204494)
passed all six targets on 2026-10-03:

| Distribution | GNOME | amd64 | arm64 |
| --- | --- | --- | --- |
| Ubuntu 24.04 | 46 | PASS | PASS |
| Ubuntu 26.04 | 50.1 | PASS | PASS |
| Debian 13 | 48.7 | PASS | PASS |

Each target passed 189 logic tests, GJS/gettext checks, both universal and target
package audits, lintian with errors/warnings fatal, seven interface languages
with 48 native editor checks per language, slow OCR termination, real pin gestures,
screenshot capture and clipboard paste, apt installation, and apt removal.
Debian uses its own native runtime in containers on the corresponding CPU runner;
only the CI runner's system D-Bus is shared for GNOME login-manager initialization.
The container's AppArmor profile is disabled for that D-Bus connection. The user's
computer and desktop settings are not changed by these CI tests.

The review corrected GJS Unicode framing, the pin grab-event root, complete pin
geometry, a monitor disappearing, graceful OCR termination, short-block OCR
fallback within one deadline, Unicode filename length, and clearing OCR buffers.
A final regression links automatic screenshot pins by the original image digest,
so deleting their source closes them even before a history entry ID was known.
That fix passes local lifecycle/native checks and the same CI matrix gates merge
and release publication. No outstanding blocking code-review findings remain.

GNOME 50 can finish startup before attaching its automation runner; the isolated
test resumes GNOME's official scripting runner when startup has already completed.
Multilingual OCR fixtures use explicit fonts and shaping languages so the interface
locale does not alter their pixels. These are test-environment corrections, not
changes to the user's GNOME startup.

Release publication reruns the matrix on main, publishes all four installers,
and downloads every asset to verify SHA256SUMS. The release's target commit and
Actions run provide the final publication evidence.

Interactive hardware, multiple physical monitors, all target applications, and
OCR accuracy on arbitrary multilingual documents remain manual acceptance tests.
The screen capture shown in the README contains only the private test desktop.
