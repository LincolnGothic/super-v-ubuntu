#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path
import subprocess
import sys
import tarfile
import io
import json

deb = Path(sys.argv[1])
archive = subprocess.check_output(['dpkg-deb', '--fsys-tarfile', str(deb)])
prefix = './usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local/'
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
    files = {x.name: x for x in tar.getmembers() if x.isfile()}
    for relative in ['extension.js', 'prefs.js', 'metadata.json', 'stylesheet.css', 'shell-compat.js',
                     'core/history.js', 'core/catalog.js', 'core/placement.js', 'core/gif.js',
                     'editor.js', 'editor-render.js', 'editor-bridge.js', 'core/editor.js',
                     'gifs.js', 'images.js', 'core/image.js', 'data/emoji.json', 'data/LICENSE.txt',
                     'schemas/org.gnome.shell.extensions.super-v-ubuntu.gschema.xml',
                     'schemas/gschemas.compiled']:
        assert prefix + relative in files, f'Missing {relative}'
    assert all(name.startswith('./usr/share/') for name in files), 'Unexpected installation path'
    assert not any('history.json' in name or 'node_modules' in name for name in files)
    metadata = json.load(tar.extractfile(prefix + 'metadata.json'))
    assert metadata['shell-version'] == ['46', '50'], 'Incorrect Shell compatibility'
    assert metadata['version-name'] == '0.1.7' and metadata['version'] == 8
    assert metadata['gettext-domain'] == 'super-v-ubuntu'
    for locale in ['zh_CN', 'zh_TW', 'ja', 'es', 'fr', 'ko']:
        name = prefix + f'locale/{locale}/messages.json'
        assert name in files, f'Missing explicit-language messages for {locale}'
        messages = json.load(tar.extractfile(name))
        assert len(messages) >= 303 and messages['Language'] and messages['Follow system']
        assert messages['Screenshot'] and messages['Clear history on shutdown']
        assert messages['Screenshot editor'] and messages['Edit after taking a screenshot']
    for locale in ['zh', 'zh_CN', 'zh_SG', 'zh_TW', 'zh_HK', 'zh_MO', 'zh_Hans', 'zh_Hant',
                   'ja', 'es', 'fr', 'ko']:
        assert prefix + f'locale/{locale}/LC_MESSAGES/super-v-ubuntu.mo' in files, f'Missing {locale} gettext catalog'
    for locale in ['zh', 'zh_Hant', 'ja', 'es', 'fr', 'ko']:
        name = prefix + f'data/emoji-locales/{locale}.json'
        assert name in files, f'Missing emoji locale {locale}'
        data = json.load(tar.extractfile(name))
        assert data['locale'] == locale and len(data['annotations']) > 3800
    for entry in files.values():
        assert entry.uid == 0 and entry.gid == 0, 'Incorrect package ownership'
        assert not entry.mode & 0o022, 'Group/world writable file'
control = subprocess.check_output(['dpkg-deb', '-f', str(deb), 'Architecture', 'Version'], text=True)
assert 'all' in control and '0.1.7' in control
dependencies = subprocess.check_output(['dpkg-deb', '-f', str(deb), 'Depends'], text=True)
for clause in ['gnome-shell (>= 46~)', 'gnome-shell (<< 47~) | gnome-shell (>= 50~)',
               'gnome-shell (<< 51~)']:
    assert clause in dependencies, f'Missing compatibility dependency: {clause}'
print('PASS: package paths, schemas, ownership, modes, architecture, version, Shell compatibility')
