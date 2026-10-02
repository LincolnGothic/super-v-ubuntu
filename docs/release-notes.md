Super V Ubuntu 0.1.1 implements a GNOME Shell popup for Super+V with local
clipboard history and a Unicode emoji picker. Clipboard features include
deduplication, search, keyboard/mouse selection, pins, individual deletion,
ordinary/full clear, configurable limits and private local persistence.
Emoji 17.0 includes 3,944 fully-qualified sequences with CLDR 48 search keywords,
categories, tones and recents. GTK4/libadwaita preferences control capture,
persistence, automatic paste, exclusions and shortcuts.

Targets: Ubuntu 24.04 LTS / GNOME Shell 46 and Ubuntu 26.04 LTS / GNOME Shell 50,
using Wayland. Release 0.1.1 adds current widget orientation, stage event-actor
and backend seat APIs with GNOME 46 fallbacks, and fixes the older stage focus
check. Metadata and package dependencies allow Shell 46 and 50.
API/source checks, automated tests and
Debian builds exist; **real GNOME Wayland GUI testing is NOT TESTED** in the
headless development environment. GNOME 47–49 and 51+ are not declared
supported. Treat desktop usability as pending validation.

Install the attached package with `sudo apt install ./super-v-ubuntu_0.1.1_all.deb`,
log out/in, then run `gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local`
as your ordinary user. Read README and SECURITY.md before enabling capture.

Known limitations: text-only history; 16 KiB entry and 2 MiB total limits;
password-origin identification is best effort; default automatic paste sends
Ctrl+V or Ctrl+Shift+V for configured terminals and cannot verify reception;
emoji restoration is explicit to avoid a clipboard-consumption race; nontext
clipboard formats are not restored; older fonts may lack new emoji glyphs;
English emoji annotations only. No telemetry or runtime networking.

Publication script verifies successful remote CI before creating the release
and verifies the downloaded `.deb` against SHA256SUMS. Desktop testing remains
a separate requirement documented in docs/testing.md.
