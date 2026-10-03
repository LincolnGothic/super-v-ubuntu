#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Extract, validate and compile gettext catalogs with standard GNU tools."""
import ast
import gettext
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = 'super-v-ubuntu'
ALIASES = {
    'zh_CN': ['zh_CN', 'zh', 'zh_SG', 'zh_Hans', 'zh_Hans_CN', 'zh_Hans_SG',
              'zh_Hans_TW', 'zh_Hans_HK', 'zh_Hans_MO'],
    'zh_TW': ['zh_TW', 'zh_HK', 'zh_MO', 'zh_Hant', 'zh_Hant_TW', 'zh_Hant_HK', 'zh_Hant_MO',
              'zh_Hant_CN', 'zh_Hant_SG'],
    'ja': ['ja'], 'es': ['es'], 'fr': ['fr'], 'ko': ['ko'],
}


def message_ids(path):
    messages = []
    current = None
    for line in path.read_text().splitlines():
        if line.startswith('msgid '):
            if current:
                messages.append(current)
            current = ast.literal_eval(line[6:])
        elif line.startswith('msgstr'):
            if current:
                messages.append(current)
            current = None
        elif current is not None and line.startswith('"'):
            current += ast.literal_eval(line)
    return sorted(messages)


def extract(directory):
    output = directory / 'extracted.pot'
    sources = sorted((ROOT / 'extension').glob('*.js')) + sorted((ROOT / 'extension/core').glob('*.js'))
    subprocess.run([os.environ.get('XGETTEXT', 'xgettext'), '--language=JavaScript',
                    '--from-code=UTF-8', '--keyword=_', '--keyword=N_', '--no-location', '--no-wrap',
                    '--package-name=' + DOMAIN, '-o', str(output), *map(str, sources)], check=True)
    return message_ids(output)


def run(mode):
    with tempfile.TemporaryDirectory(prefix='super-v-translations-') as temporary:
        directory = Path(temporary)
        messages = extract(directory)
        if mode == 'pot':
            quote = lambda value: json.dumps(value, ensure_ascii=False)
            header = 'Project-Id-Version: super-v-ubuntu\nContent-Type: text/plain; charset=UTF-8\n'
            content = '# SPDX-License-Identifier: GPL-3.0-or-later\n# Translation template; regenerate with make pot.\n'
            content += 'msgid ""\nmsgstr ' + quote(header) + '\n\n'
            for message in messages:
                if re.search(r'%[sd]', message):
                    content += '#, javascript-format\n'
                content += 'msgid ' + quote(message) + '\nmsgstr ""\n\n'
            (ROOT / 'po' / f'{DOMAIN}.pot').write_text(content)
            return
        assert message_ids(ROOT / 'po' / f'{DOMAIN}.pot') == messages, 'Stale template; run make pot'
        for language, aliases in ALIASES.items():
            source = ROOT / 'po' / f'{language}.po'
            assert message_ids(source) == messages, f'{language}: missing, duplicate or obsolete messages'
            compiled = directory / f'{language}.mo'
            subprocess.run([os.environ.get('MSGFMT', 'msgfmt'), '--check', '--check-format',
                            '-o', str(compiled), str(source)], check=True)
            with compiled.open('rb') as stream:
                catalog = gettext.GNUTranslations(stream)
            assert all(message in catalog._catalog and catalog.gettext(message) for message in messages), \
                f'{language}: untranslated or fuzzy messages'
            for message in messages:
                assert re.findall(r'%[sd]', message) == re.findall(r'%[sd]', catalog.gettext(message)), \
                    f'{language}: incorrect placeholders in {message}'
            if mode == 'build':
                # The explicit language setting uses these app-local lookups;
                # both formats come from the same checked .po/.mo messages.
                lookup = ROOT / 'extension/locale' / language / 'messages.json'
                lookup.parent.mkdir(parents=True, exist_ok=True)
                lookup.write_text(json.dumps({message: catalog.gettext(message) for message in messages},
                                             ensure_ascii=False, indent=2) + '\n')
                lookup.chmod(0o644)
                for alias in aliases:
                    destination = ROOT / 'extension/locale' / alias / 'LC_MESSAGES' / f'{DOMAIN}.mo'
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(compiled.read_bytes())
                    destination.chmod(0o644)
        print(f'PASS: {len(messages)} messages in {len(ALIASES)} complete gettext catalogs')


if __name__ == '__main__':
    run(sys.argv[1] if len(sys.argv) > 1 else 'check')
