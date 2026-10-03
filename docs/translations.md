# Translations

One build supports English (source/fallback), Simplified Chinese (`zh_CN`),
Traditional Chinese (`zh_TW`), Japanese (`ja`), Spanish (`es`), French (`fr`) and
Korean (`ko`). GNOME initializes the `super-v-ubuntu` gettext domain through
`metadata.json`; the popup and preferences follow the session locale. English
source strings are the fallback and do not need a separate catalog.

Chinese catalogs are compiled under regional/script aliases, including Singapore,
Taiwan, Hong Kong and Macau. `extension/core/localization.js` maps the ordered
GLib language list to the corresponding CLDR dataset. Explicit Hans/Hant script
selection takes precedence over the region. Locale changes require logout/login.

## Update an interface translation

Install `gettext` and the normal README build dependencies. Edit the matching
`po/{language}.po` with a gettext editor or a text editor. Keep `%s`, `%d`,
shortcut syntax, technical identifiers and units intact. The current messages
use one placeholder each. Preserve the `javascript-format` flags; add plural
messages with proper gettext plural handling if the UI ever needs them.

After adding or changing an English string:

```sh
make pot
msgmerge --update --backup=none po/es.po po/super-v-ubuntu.pot
# Repeat msgmerge for the other catalogs, then review and translate new/fuzzy entries.
make test
make package
```

Mark UI strings with `_('message')`. Stable data labels use `N_('message')` and
are translated only for display/search, keeping stored IDs stable. Do not use
translated values as settings keys or persisted glyph IDs. Wrap complete
sentences rather than concatenating translated fragments.

`make check` compares the template with current source, rejects missing/fuzzy/
empty/obsolete messages, compiles with `msgfmt --check --check-format`, and checks
placeholders. `make translations` builds private `extension/locale/*/LC_MESSAGES`
catalogs. Both `.deb` and local installation include these and localized emoji
data. Compiled `.mo` files are build products, not committed sources.

## Emoji translations

Emoji names/keywords come from pinned CLDR 48, not manually maintained `.po`
entries. See [provenance](emoji-data.md). Regenerate offline with `make emoji`.
Missing entries/names use English, and English aliases remain searchable.
Translations never alter inserted glyphs, categories, skin tones or recents.

Kaomoji and symbol names are part of the gettext catalogs. Both localized and
English names remain searchable; user clipboard content and GIF filenames are
shown as entered and are never translated.

## Review and validation

Review wording in context, especially clear/erase actions and privacy text.
The initial catalogs are project-authored translations; fluent speakers are
welcome to improve regional wording. Detailed developer/security documentation
remains in English; translated guides cover installation and everyday use.

`make test` includes pure search/locale checks, 17 actual GJS/Gettext lookups and
English fallback. Those checks generate an isolated `en_US.UTF-8` test locale
using `localedef` (from the `locales` build dependency), without altering global
locale settings. `scripts/test-shell.sh` checks real St/Clutter layout in seven
fresh headless Wayland sessions; it requires GNOME Shell and a generated UTF-8
locale. CI also checks packaged catalogs, schemas, data and lintian.

These checks cover rendering and localization. Full desktop clipboard/paste
acceptance remains the separate procedure in [testing.md](testing.md).
