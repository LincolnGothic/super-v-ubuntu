// SPDX-License-Identifier: GPL-3.0-or-later
// GJS TextDecoder does not support streaming. Keep bytes until a complete
// newline-delimited frame arrives so split Unicode code points stay intact.
export class LineFrames {
    constructor(limit) { this.limit = limit; this.chunks = []; this.size = 0; }
    push(bytes) {
        const frames = [];
        let start = 0;
        for (let i = 0; i <= bytes.length; i++) {
            if (i !== bytes.length && bytes[i] !== 10) continue;
            const part = bytes.slice(start, i);
            this.size += part.length;
            if (this.size > this.limit) throw new Error('Oversized editor frame');
            if (part.length) this.chunks.push(part);
            if (i < bytes.length) {
                const frame = new Uint8Array(this.size);
                let offset = 0;
                for (const chunk of this.chunks) { frame.set(chunk, offset); offset += chunk.length; }
                frames.push(new TextDecoder('utf-8', {fatal: true}).decode(frame));
                this.chunks = []; this.size = 0;
            }
            start = i + 1;
        }
        return frames;
    }
    finish() { if (this.size) throw new Error('Incomplete editor frame'); }
}
