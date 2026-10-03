// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import {catalogTranslator, resolveLanguage} from './core/localization.js';

// Private catalogs are generated from the validated gettext sources. Keeping
// this lookup app-local allows live language changes without changing Shell's
// process-wide locale or another extension's translations.
let translate = catalogTranslator();
const catalogs = new Map();

export function initTranslations(directory, choice = 'system') {
    const language = resolveLanguage(choice, GLib.get_language_names());
    const key = `${directory.get_path()}:${language}`;
    if (!catalogs.has(key)) {
        let messages = {};
        if (language !== 'en') {
            try {
                const file = directory.get_child('locale').get_child(language).get_child('messages.json');
                messages = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1]));
            } catch {
                // Missing or unreadable messages use their English source text.
            }
        }
        catalogs.set(key, catalogTranslator(messages));
    }
    translate = catalogs.get(key);
    return language;
}

export const gettext = message => translate(message);
