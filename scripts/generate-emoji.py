#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Deterministic, offline generator. Inputs are pinned Unicode 17 / CLDR 48."""
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'vendor/unicode'


def generate():
    annotations = {}
    for name in ['en.xml', 'en-derived.xml']:
        for node in ET.parse(INPUT / name).iter('annotation'):
            key = node.attrib['cp'].replace('\ufe0f', '')
            annotations.setdefault(key, set()).update(
                x.strip() for x in (node.text or '').split('|') if x.strip())
    emoji = []
    group, subgroup = '', ''
    tones = dict(zip(range(0x1F3FB, 0x1F400),
                     ['light', 'medium-light', 'medium', 'medium-dark', 'dark']))
    for line in (INPUT / 'emoji-test.txt').read_text().splitlines():
        if line.startswith('# group: '):
            group = line[9:]
        elif line.startswith('# subgroup: '):
            subgroup = line[12:]
        match = re.match(r'^([0-9A-F ]+)\s*; fully-qualified\s*# \S+ E[\d.]+ (.+)$', line)
        if not match:
            continue
        points = [int(x, 16) for x in match[1].split()]
        text = ''.join(chr(x) for x in points)
        emoji.append(dict(text=text, name=match[2], group=group, subgroup=subgroup,
                          tones=[tones[x] for x in points if x in tones],
                          keywords=sorted(annotations.get(text.replace('\ufe0f', ''), set()))))
    if len(emoji) < 3900 or len({x['text'] for x in emoji}) != len(emoji):
        raise ValueError('Unexpected or duplicate Emoji 17 data')
    inputs = {name: hashlib.sha256((INPUT / name).read_bytes()).hexdigest()
              for name in ['emoji-test.txt', 'en.xml', 'en-derived.xml', 'LICENSE.txt']}
    result = dict(unicodeVersion='17.0', cldrVersion='48', inputHashes=inputs, emoji=emoji)
    return json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'


if __name__ == '__main__':
    output = ROOT / 'extension/data/emoji.json'
    output.write_text(generate())
    print(f'Generated {len(json.loads(output.read_text())["emoji"])} fully-qualified emoji')
