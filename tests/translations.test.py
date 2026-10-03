#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Exercise actual GJS/Gettext locale fallback in separate clean processes."""
import os
import subprocess
import tempfile

with tempfile.TemporaryDirectory(prefix='super-v-test-locale-') as directory:
    # Generate just one UTF-8 test locale locally, without root or global locale changes.
    subprocess.run(['localedef', '--no-archive', '-i', 'en_US', '-f', 'UTF-8',
                    directory + '/en_US.UTF-8'], check=True)
    for language in ['en', 'zh_CN', 'zh_TW', 'zh_HK', 'zh_MO', 'zh_SG', 'zh_Hans', 'zh_Hant',
                     'ja', 'ja_JP', 'es', 'es_MX', 'fr', 'fr_CA', 'ko', 'ko_KR', 'de_DE']:
        environment = dict(os.environ, LANGUAGE=language, LC_ALL='en_US.UTF-8', LOCPATH=directory)
        subprocess.run(['gjs', '-m', 'tests/translations-gjs.js'], env=environment, check=True)
print('PASS: 17 actual GJS/Gettext language and regional fallback checks')
