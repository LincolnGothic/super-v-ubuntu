#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
import subprocess
import sys

major = int(subprocess.check_output(['eslint', '--version'], text=True).strip().lstrip('v').split('.')[0])
flags = ['--no-config-lookup', '-c', 'eslint.config.mjs'] if major >= 9 else ['--no-eslintrc', '-c', 'eslint.json', '-f', 'unix']
sys.exit(subprocess.call(['eslint', *flags, 'extension', 'tests', 'scripts', '--ext', '.js']))
