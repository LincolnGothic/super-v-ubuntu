# Contributing

Use Ubuntu 24.04 / GNOME 46 or Ubuntu 26.04 / GNOME 50 with Wayland and the
build dependencies in the README. Make small
changes, run `make test` and `make package`, and inspect the `.deb` with lintian
and `scripts/audit-package.py`. Logic tests run without a desktop. Clipboard,
popup and paste changes also require the real Wayland matrix in `docs/testing.md`.
Never label a mock test as desktop verification.

Keep platform-independent logic in `extension/core/`. Do not introduce runtime
network calls, clipboard logging, shell execution of clipboard data, a daemon,
X11-only tools or unbounded history reads. Cancel signals, timeouts and pending
reads on disable. Preferences must not import St, Shell, Meta or Clutter.
Do not copy third-party extension implementation. Consult official API docs
and record new GNOME version audits before changing metadata support.

Include tests for behavioral changes, update relevant documentation and
CHANGELOG, and use meaningful commit messages. Source contributions are
GPL-3.0-or-later; generated Unicode data retains its upstream license.
Do not upload real clipboard histories, credentials or personal desktop logs.

For translations, see [docs/translations.md](docs/translations.md). The `.po`
files are the canonical UI translation sources; do not edit compiled `.mo` files.
