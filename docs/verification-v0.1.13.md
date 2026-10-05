# v0.1.13 local validation

The screenshot path previously selected an area first, then captured the live
pixels after closing the selection overlay. It now captures stage content as
capture starts, before taking a selection grab, and crops that retained texture.
The native GNOME 50.1 Wayland check removes a colored desktop element during
selection and confirms its exact RGB value in the exported PNG.

Clipboard import previously trusted PNG/JPEG MIME labels and tried only the first
offered format. It now identifies actual PNG/JPEG bytes, handles aliases and
fallback offers, converts bounded supported BMP/WebP data, and imports a single
local image URI. The reported source was QQ’s Copy image. QQ’s installed version
and that exact application workflow have not yet been reproduced. A format-only
probe during the chat saw a text clipboard, so it did not identify QQ’s image offer.

Executed checks:

- Full Debian build and `make test`: 206 Node tests, 44 GJS checks, 17 actual
  Gettext/regional checks, lint, schemas and generated-data checks pass.
- Disposable GNOME Shell 50.1 Wayland sessions pass in English, Simplified Chinese,
  Traditional Chinese, Japanese, Spanish, French and Korean. Each exercises
  mislabeled JPEG, bitmap and copied-file import plus frozen preview/export,
  cancellation, real application image paste, editor, pins and OCR.
- The 0.1.13 Debian installer is built locally. Package files, modes, translations,
  version and dependency audit pass. Lintian is unavailable in this environment.
- The exact QQ application copy path and the user’s normal desktop were not
  modified or verified by the isolated tests.

 These local checks do
not establish GNOME 46/48, all distribution/CPU combinations, hardware GPU behavior,
HiDPI/multi-monitor desktop acceptance, or every source/receiving application.
The GitHub CI and release workflow is authoritative for remote checks and published assets.
