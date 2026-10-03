// SPDX-License-Identifier: GPL-3.0-or-later
// Mark stable data labels for gettext extraction without translating their IDs.
export const N_ = message => message;

export const languageOptions = [
    {id: 'system', label: N_('Follow system')},
    {id: 'en', label: 'English'}, {id: 'zh_CN', label: '简体中文'},
    {id: 'zh_TW', label: '繁體中文'}, {id: 'ja', label: '日本語'},
    {id: 'es', label: 'Español'}, {id: 'fr', label: 'Français'},
    {id: 'ko', label: '한국어'},
];

export function resolveLanguage(choice, languages) {
    if (choice !== 'system' && languageOptions.some(option => option.id === choice))
        return choice;
    const locale = emojiLocale(languages);
    return {zh: 'zh_CN', zh_Hant: 'zh_TW'}[locale] ?? locale;
}

export const annotationLocale = language => ({zh_CN: 'zh', zh_TW: 'zh_Hant'}[language] ?? language);

export function catalogTranslator(messages = {}) {
    if (!messages || typeof messages !== 'object' || Array.isArray(messages))
        messages = {};
    return message => Object.hasOwn(messages, message) && typeof messages[message] === 'string' && messages[message]
        ? messages[message] : message;
}

export const groupLabels = {
    All: N_('All'), Recent: N_('Recent'),
    'Smileys & Emotion': N_('Smileys & Emotion'),
    'People & Body': N_('People & Body'),
    'Animals & Nature': N_('Animals & Nature'),
    'Food & Drink': N_('Food & Drink'),
    'Travel & Places': N_('Travel & Places'),
    Activities: N_('Activities'), Objects: N_('Objects'),
    Symbols: N_('Symbols'), Flags: N_('Flags'),
};

export const toneLabels = {
    all: N_('All'), default: N_('Default'), light: N_('Light'),
    'medium-light': N_('Medium light'), medium: N_('Medium'),
    'medium-dark': N_('Medium dark'), dark: N_('Dark'),
};

// GLib's ordered language list already includes LANGUAGE and locale fallbacks.
// Resolve script/region before falling back to generic Chinese (Simplified).
export function emojiLocale(languages) {
    for (const language of languages) {
        const parts = language.split('.')[0].split('@')[0].replace(/-/gu, '_').toLowerCase().split('_');
        if (parts[0] === 'zh') {
            if (parts.includes('hans'))
                return 'zh';
            return parts.includes('hant') || parts.some(x => ['tw', 'hk', 'mo'].includes(x))
                ? 'zh_Hant' : 'zh';
        }
        if (['ja', 'es', 'fr', 'ko', 'en'].includes(parts[0]))
            return parts[0];
        if (['c', 'posix'].includes(parts[0]))
            return 'en';
    }
    return 'en';
}

export function localizeEmoji(records, annotations = {}) {
    return records.map(record => {
        const annotation = annotations[record.text];
        if (!annotation)
            return record;
        return {...record, name: annotation.name || record.name,
            keywords: [...new Set([record.name, ...record.keywords, ...annotation.keywords])]};
    });
}

// Each UI message has one placeholder; callback replacement preserves literal
// dollar signs and percent signs in user filenames and storage paths.
export function format(message, value) {
    return message.replace(/%[sd]/u, () => String(value));
}
