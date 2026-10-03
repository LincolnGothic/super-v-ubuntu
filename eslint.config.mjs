// SPDX-License-Identifier: GPL-3.0-or-later
import {readFileSync} from 'node:fs';
const legacy = JSON.parse(readFileSync(new URL('./eslint.json', import.meta.url), 'utf8'));
const nodeGlobals = Object.fromEntries(['console', 'process', 'Buffer', 'URL', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone', 'global', 'module', 'require',
    'exports', '__dirname', '__filename'].map(name => [name, 'readonly']));
export default [{files: ['**/*.js'], languageOptions: {ecmaVersion: 2022, sourceType: 'module',
    globals: {...nodeGlobals, ...legacy.globals}}, rules: legacy.rules}];
