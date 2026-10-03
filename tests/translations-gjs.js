// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import {bindtextdomain, textdomain} from 'gettext';
import {gettext as _} from '../extension/translations.js';
import {emojiLocale, format} from '../extension/core/localization.js';

bindtextdomain('super-v-ubuntu', `${GLib.get_current_dir()}/extension/locale`);
// Standalone GJS has no translated application domain. GNOME Shell establishes
// its own domain; emulate that initialization for GLib's dgettext optimization.
textdomain('super-v-ubuntu');
const locale = GLib.getenv('LANGUAGE');
const expected = {en: 'Settings', zh_CN: '设置', zh_TW: '設定', zh_HK: '設定', zh_MO: '設定',
    zh_SG: '设置', zh_Hans: '设置', zh_Hant: '設定', ja: '設定', ja_JP: '設定',
    es: 'Ajustes', es_MX: 'Ajustes', fr: 'Paramètres', fr_CA: 'Paramètres', ko: '설정', ko_KR: '설정',
    de_DE: 'Settings'};
if (_('Settings') !== expected[locale])
    throw new Error(`${locale}: incorrect gettext lookup ${_('Settings')}`);
const count = format(_('Show more (%d)'), 17);
if (!count.includes('17') || count.includes('%d'))
    throw new Error(`${locale}: incorrect count interpolation`);
if (_('untranslated fallback') !== 'untranslated fallback')
    throw new Error('Missing message must fall back to English');
print(JSON.stringify({locale, settings: _('Settings'), emojiLocale: emojiLocale(GLib.get_language_names())}));
