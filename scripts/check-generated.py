#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path
import importlib.util
import json

path = Path(__file__).with_name('generate-emoji.py')
spec = importlib.util.spec_from_file_location('emoji_generator', path)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
actual = (path.parent.parent / 'extension/data/emoji.json').read_text()
if actual != generator.generate():
    raise SystemExit('Emoji dataset differs from pinned inputs; run make emoji')
for locale in generator.LOCALES:
    path = generator.ROOT / 'extension/data/emoji-locales' / f'{locale}.json'
    if path.read_text() != generator.generate_locale(locale, json.loads(actual)['emoji']):
        raise SystemExit(f'Emoji locale {locale} differs from pinned inputs; run make emoji')
print('PASS: deterministic emoji dataset matches pinned Unicode/CLDR inputs')
