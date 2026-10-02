# Emoji provenance

The runtime database contains all **3,944 fully-qualified Emoji 17.0** sequences
from Unicode's emoji-test.txt. Skin-tone-only components are not standalone
fully-qualified emoji and are intentionally absent. Non-fully-qualified
spellings of the same emoji are not duplicated. All fully-qualified mixed-tone
and ZWJ sequences are retained.

Pinned authoritative inputs:

* https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt
* https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotations/en.xml
* https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotationsDerived/en.xml
* https://www.unicode.org/license.txt

The exact downloaded files are in `vendor/unicode/`. The database includes
their SHA256 hashes; unit tests verify them. `scripts/generate-emoji.py` parses
group/subgroup and Unicode names, joins English CLDR keywords after removing
optional VS16 selectors for annotation lookup, and records each skin-tone
modifier. `make emoji` regenerates it without network access; `make check`
compares it byte-for-byte against the generator's output.

Data is Copyright © Unicode, Inc., distributed under Unicode License V3
(SPDX Unicode-3.0). The full license is `vendor/unicode/LICENSE.txt` and is
installed beside the runtime database as `data/LICENSE.txt`. Generator source
is original GPL-3.0-or-later code. No third-party clipboard-manager source is
included. The host font determines visible glyph support; an older Ubuntu
font may not show every Unicode 17 sequence, even though the text is bundled.
