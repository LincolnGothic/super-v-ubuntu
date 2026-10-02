// SPDX-License-Identifier: GPL-3.0-or-later
import {searchKey} from './history.js';

export class EmojiIndex {
    constructor(records, recent = []) {
        this.records = records;
        this.byText = new Map(records.map(x => [x.text, x]));
        this.keys = new Map(records.map(x => [x.text,
            searchKey([x.name, x.group, x.subgroup, ...x.keywords].join(' '))]));
        this.groups = [...new Set(records.map(x => x.group))];
        this.setRecent(recent);
    }

    setRecent(recent) {
        this.recent = [...new Set(recent.filter(x => this.byText.has(x)))].slice(0, 30);
    }

    use(text) {
        if (!this.byText.has(text))
            return false;
        this.recent = [text, ...this.recent.filter(x => x !== text)].slice(0, 30);
        return true;
    }

    search(query = '', group = 'All', tone = 'all') {
        const terms = searchKey(query).trim().split(/\s+/u).filter(Boolean);
        const records = group === 'Recent' ? this.recent.map(x => this.byText.get(x))
            : this.records;
        return records.filter(x => (['All', 'Recent'].includes(group) || x.group === group) &&
            (tone === 'all' || x.tones.length === 0 || x.tones.every(t => t === tone)) &&
            terms.every(term => this.keys.get(x.text).includes(term) || x.text.includes(term)));
    }
}
