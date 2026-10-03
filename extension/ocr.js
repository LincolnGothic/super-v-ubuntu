// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import {imageInfo} from './core/image.js';
import {MAX_OCR_TEXT_BYTES, ocrLanguageArgs} from './core/export.js';
import {runProcess} from './process.js';

export class OcrEngine {
    constructor() { this.program = GLib.find_program_in_path('tesseract'); }
    async languages(cancel) {
        if (!this.program) throw new Error('OCR unavailable');
        const bytes = await runProcess([this.program, '--list-langs'], null, {cancel, outputLimit: 4096, timeoutMs: 5000});
        return new TextDecoder('utf-8', {fatal: true}).decode(bytes).split(/\r?\n/u)
            .filter(line => /^[a-zA-Z0-9_]{1,32}$/u.test(line) && line !== 'osd').slice(0, 100);
    }
    async recognize(bytes, language, installed, cancel) {
        imageInfo(bytes, 'image/png');
        const selected = ocrLanguageArgs(language, installed);
        const output = await runProcess([this.program, 'stdin', 'stdout', '-l', selected, '--psm', '3'], bytes,
            {cancel, outputLimit: MAX_OCR_TEXT_BYTES, timeoutMs: 30000});
        return new TextDecoder('utf-8', {fatal: true}).decode(output).replace(/\0/gu, '').trim();
    }
}
