// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {gifPaths, validateGif, MAX_GIF_BYTES} from './core/gif.js';
import {searchKey} from './core/history.js';

export class GifLibrary {
    constructor(settings) {
        this.settings = settings;
    }

    search(query = '') {
        const terms = searchKey(query).trim().split(/\s+/u).filter(Boolean);
        return gifPaths(this.settings.get_strv('gif-files')).map(path => ({path,
            name: GLib.path_get_basename(path), text: ''})).filter(entry =>
            terms.every(term => searchKey(entry.name).includes(term)));
    }

    async read(entry, cancellable = null) {
        const file = Gio.File.new_for_path(entry.path);
        const info = file.query_info('standard::type,standard::size',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, cancellable);
        if (info.get_file_type() !== Gio.FileType.REGULAR || info.get_size() > MAX_GIF_BYTES)
            throw new Error('Choose a regular GIF file smaller than 8 MiB.');
        const stream = await new Promise((resolve, reject) => {
            file.read_async(GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
                try { resolve(source.read_finish(result)); } catch (error) { reject(error); }
            });
        });
        try {
            const chunks = [];
            let size = 0;
            while (size <= MAX_GIF_BYTES) {
                const bytes = await new Promise((resolve, reject) => {
                    stream.read_bytes_async(Math.min(65536, MAX_GIF_BYTES + 1 - size),
                        GLib.PRIORITY_DEFAULT, cancellable, (input, result) => {
                            try { resolve(input.read_bytes_finish(result)); } catch (error) { reject(error); }
                        });
                });
                const data = bytes.get_data();
                if (!data.length)
                    break;
                size += data.length;
                chunks.push(data);
            }
            if (size > MAX_GIF_BYTES)
                throw new Error('The GIF exceeds 8 MiB.');
            const output = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) {
                output.set(chunk, offset);
                offset += chunk.length;
            }
            validateGif(output);
            return output;
        } finally {
            stream.close(null);
        }
    }
}
