// SPDX-License-Identifier: GPL-3.0-or-later
import {validateLimit, MAX_PINNED, MAX_TEXT_BYTES, MAX_TOTAL_BYTES,
    MAX_STATE_BYTES} from './settings.js';

const encoder = new TextEncoder();
export const byteLength = text => encoder.encode(text).length;
export const searchKey = text => text.normalize('NFKC').toLowerCase();

export function validText(text) {
    return typeof text === 'string' && text.length > 0 &&
        !text.includes('\0') && byteLength(text) <= MAX_TEXT_BYTES;
}

export class History {
    constructor(limit = 100, clock = () => Date.now()) {
        this.limit = validateLimit(limit);
        this.clock = clock;
        this.entries = [];
        this.serial = 0;
    }

    add(text) {
        if (!validText(text))
            return null;
        const existing = this.entries.find(x => x.text === text);
        const entry = existing ?? {id: `${this.clock()}-${++this.serial}`,
            text, pinned: false, createdAt: this.clock()};
        // IDs must remain unique even after loading entries from this process.
        if (!existing) {
            while (this.entries.some(x => x.id === entry.id))
                entry.id = `${this.clock()}-${++this.serial}`;
        }
        entry.createdAt = this.clock();
        this.entries = [entry, ...this.entries.filter(x => x !== existing)];
        this.trim();
        return this.entries.includes(entry) ? entry : null;
    }

    trim() {
        let ordinary = 0;
        this.entries = this.entries.filter(x => x.pinned || ++ordinary <= this.limit);
        let bytes = this.entries.reduce((sum, x) => sum + byteLength(x.text), 0);
        for (let i = this.entries.length - 1; i >= 0 && bytes > MAX_TOTAL_BYTES; i--) {
            if (!this.entries[i].pinned) {
                bytes -= byteLength(this.entries[i].text);
                this.entries.splice(i, 1);
            }
        }
    }

    setLimit(value) {
        this.limit = validateLimit(value);
        this.trim();
    }

    togglePin(id) {
        const entry = this.entries.find(x => x.id === id);
        if (!entry || (!entry.pinned &&
            this.entries.filter(x => x.pinned).length >= MAX_PINNED))
            return false;
        entry.pinned = !entry.pinned;
        this.trim();
        return true;
    }

    delete(id) {
        const size = this.entries.length;
        this.entries = this.entries.filter(x => x.id !== id);
        return size !== this.entries.length;
    }

    clear(includePinned = false) {
        this.entries = includePinned ? [] : this.entries.filter(x => x.pinned);
    }

    search(query = '') {
        const terms = searchKey(query).trim().split(/\s+/u).filter(Boolean);
        return this.entries.filter(x => {
            const key = searchKey(x.text);
            return terms.every(term => key.includes(term));
        });
    }

    toJSON(recent = []) {
        return JSON.stringify({version: 1, entries: this.entries, recent});
    }

    static deserialize(raw, limit = 100) {
        const history = new History(limit);
        try {
            if (typeof raw !== 'string' || byteLength(raw) > MAX_STATE_BYTES)
                throw new Error('size');
            const data = JSON.parse(raw);
            if (data?.version !== 1 || !Array.isArray(data.entries) ||
                data.entries.length > 600)
                throw new Error('format');
            const texts = new Set();
            const ids = new Set();
            let pinned = 0;
            let bytes = 0;
            for (const x of data.entries) {
                if (!x || !validText(x.text) || typeof x.id !== 'string' ||
                    !/^[\w-]{1,80}$/u.test(x.id) || typeof x.pinned !== 'boolean' ||
                    !Number.isSafeInteger(x.createdAt) || x.createdAt < 0 ||
                    ids.has(x.id) || texts.has(x.text))
                    throw new Error('entry');
                pinned += Number(x.pinned);
                bytes += byteLength(x.text);
                if (pinned > MAX_PINNED || bytes > MAX_TOTAL_BYTES)
                    throw new Error('budget');
                ids.add(x.id);
                texts.add(x.text);
                history.entries.push({id: x.id, text: x.text,
                    pinned: x.pinned, createdAt: x.createdAt});
            }
            history.trim();
            const recent = Array.isArray(data.recent) ? data.recent.filter(x =>
                typeof x === 'string' && x.length <= 64).slice(0, 30) : [];
            return {history, recent, recovered: false};
        } catch {
            return {history: new History(limit), recent: [], recovered: true};
        }
    }
}
