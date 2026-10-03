// SPDX-License-Identifier: GPL-3.0-or-later
import {N_} from './core/localization.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {MAX_STATE_BYTES} from './core/settings.js';
import {imageFilename, MAX_IMAGE_BYTES} from './core/image.js';

const nofollow = Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS;
const decoder = new TextDecoder('utf-8', {fatal: true});

function isMissing(error) {
    return error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND);
}

export class StateStore {
    constructor(base = GLib.get_user_state_dir(), onError = () => {}) {
        this.directory = Gio.File.new_for_path(GLib.build_filenamev([base, 'super-v-ubuntu']));
        this.file = this.directory.get_child('history.json');
        this.imageDirectory = this.directory.get_child('images');
        this._writtenImages = new Set();
        this.onError = onError;
        this.persist = true;
        this._desired = undefined;
        this._running = null;
        this._ready = false;
    }

    _prepareImages() {
        this._prepare();
        try { this.imageDirectory.make_directory(null); } catch (error) {
            if (!error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
                throw error;
        }
        const info = this.imageDirectory.query_info('standard::type,owner::user', nofollow, null);
        if (info.get_file_type() !== Gio.FileType.DIRECTORY ||
            info.get_attribute_string('owner::user') !== GLib.get_user_name())
            throw new Error('Invalid image directory');
        this.imageDirectory.set_attribute_uint32('unix::mode', 0o700, nofollow, null);
    }

    async loadImage(entry, cancellable = null) {
        const name = imageFilename(entry);
        const directoryInfo = this.imageDirectory.query_info('standard::type,owner::user', nofollow, cancellable);
        if (directoryInfo.get_file_type() !== Gio.FileType.DIRECTORY ||
            directoryInfo.get_attribute_string('owner::user') !== GLib.get_user_name())
            throw new Error('Invalid image directory');
        this.imageDirectory.set_attribute_uint32('unix::mode', 0o700, nofollow, cancellable);
        const file = this.imageDirectory.get_child(name);
        const info = file.query_info('standard::type,standard::size', nofollow, cancellable);
        if (info.get_file_type() !== Gio.FileType.REGULAR || info.get_size() !== entry.bytes)
            throw new Error('Invalid stored image');
        file.set_attribute_uint32('unix::mode', 0o600, nofollow, cancellable);
        const stream = await new Promise((resolve, reject) => {
            file.read_async(GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
                try { resolve(source.read_finish(result)); } catch (error) { reject(error); }
            });
        });
        try {
            const bytes = new Uint8Array(entry.bytes);
            let offset = 0;
            while (offset <= entry.bytes) {
                const chunk = await new Promise((resolve, reject) => {
                    stream.read_bytes_async(Math.min(65536, entry.bytes + 1 - offset),
                        GLib.PRIORITY_DEFAULT, cancellable, (input, result) => {
                            try { resolve(input.read_bytes_finish(result).get_data()); } catch (error) { reject(error); }
                        });
                });
                if (!chunk.length)
                    break;
                if (offset + chunk.length > bytes.length || offset + chunk.length > MAX_IMAGE_BYTES)
                    throw new Error('Stored image exceeds its size');
                bytes.set(chunk, offset);
                offset += chunk.length;
            }
            if (offset !== entry.bytes || GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA256,
                new GLib.Bytes(bytes)) !== entry.digest)
                throw new Error('Stored image changed');
            this._writtenImages.add(name);
            return bytes;
        } finally {
            stream.close(null);
        }
    }

    async _cleanupImages(keep = new Set()) {
        let info;
        try {
            info = this.imageDirectory.query_info('standard::type,owner::user', nofollow, null);
        } catch (error) {
            if (isMissing(error))
                return;
            throw error;
        }
        if (info.get_file_type() === Gio.FileType.SYMBOLIC_LINK) {
            this.imageDirectory.delete(null);
            this._writtenImages.clear();
            return;
        }
        if (info.get_file_type() !== Gio.FileType.DIRECTORY ||
            info.get_attribute_string('owner::user') !== GLib.get_user_name())
            throw new Error('Invalid image directory');
        const enumerator = this.imageDirectory.enumerate_children('standard::name', nofollow, null);
        try {
            let child;
            while ((child = enumerator.next_file(null))) {
                const name = child.get_name();
                if (!/^[a-f0-9]{64}\.(png|jpg)$/u.test(name) || keep.has(name))
                    continue;
                const file = this.imageDirectory.get_child(name);
                await new Promise((resolve, reject) => {
                    file.delete_async(GLib.PRIORITY_DEFAULT, null, (source, result) => {
                        try { resolve(source.delete_finish(result)); } catch (error) { reject(error); }
                    });
                });
                this._writtenImages.delete(name);
            }
        } finally {
            enumerator.close(null);
        }
    }

    _prepare() {
        if (this._ready)
            return;
        const path = this.directory.get_path();
        if (GLib.mkdir_with_parents(path, 0o700) !== 0)
            throw new Error('Cannot create state directory');
        const info = this.directory.query_info('standard::type,owner::user', nofollow, null);
        if (info.get_file_type() !== Gio.FileType.DIRECTORY ||
            info.get_attribute_string('owner::user') !== GLib.get_user_name())
            throw new Error('State directory must be owned by the current user and not a symlink');
        this.directory.set_attribute_uint32('unix::mode', 0o700, nofollow, null);
        this._ready = true;
    }

    async load(cancellable = null) {
        let stream = null;
        try {
            this._prepare();
            const info = this.file.query_info('standard::type,standard::size', nofollow, cancellable);
            if (info.get_file_type() !== Gio.FileType.REGULAR ||
                info.get_size() > MAX_STATE_BYTES)
                throw new Error('Invalid state file');
            this.file.set_attribute_uint32('unix::mode', 0o600, nofollow, cancellable);
            stream = await new Promise((resolve, reject) => {
                this.file.read_async(GLib.PRIORITY_DEFAULT, cancellable, (file, result) => {
                    try { resolve(file.read_finish(result)); } catch (error) { reject(error); }
                });
            });
            const chunks = [];
            let size = 0;
            while (size <= MAX_STATE_BYTES) {
                const bytes = await new Promise((resolve, reject) => {
                    stream.read_bytes_async(65536, GLib.PRIORITY_DEFAULT, cancellable,
                        (input, result) => {
                            try { resolve(input.read_bytes_finish(result)); } catch (error) { reject(error); }
                        });
                });
                const data = bytes.get_data();
                if (!data.length)
                    break;
                size += data.length;
                chunks.push(data);
            }
            if (size > MAX_STATE_BYTES)
                throw new Error('State file too large');
            const output = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) {
                output.set(chunk, offset);
                offset += chunk.length;
            }
            return decoder.decode(output);
        } catch (error) {
            if (isMissing(error) || error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                return null;
            this.onError(N_('Stored history could not be read. It has been removed.'));
            await this.erase();
            return null;
        } finally {
            if (stream)
                stream.close(null);
        }
    }

    save(raw, images = new Map()) {
        if (!this.persist)
            return this.erase();
        if (new TextEncoder().encode(raw).length > MAX_STATE_BYTES) {
            this.onError(N_('History exceeds the storage limit.'));
            return Promise.resolve();
        }
        this._desired = {raw, images: new Map(images)};
        return this._pump();
    }

    erase() {
        this._desired = null;
        return this._pump();
    }

    flush() {
        return this._running ?? Promise.resolve();
    }

    _pump() {
        if (this._running)
            return this._running;
        this._running = (async () => {
            while (this._desired !== undefined) {
                const request = this._desired;
                this._desired = undefined;
                try {
                    this._prepare();
                    if (request === null || !this.persist) {
                        try {
                            await new Promise((resolve, reject) => {
                                this.file.delete_async(GLib.PRIORITY_DEFAULT, null, (file, result) => {
                                    try { resolve(file.delete_finish(result)); } catch (error) { reject(error); }
                                });
                            });
                        } catch (error) {
                            if (!isMissing(error))
                                throw error;
                        }
                        await this._cleanupImages();
                    } else {
                        if (request.images.size)
                            this._prepareImages();
                        for (const [name, bytes] of request.images) {
                            if (!/^[a-f0-9]{64}\.(png|jpg)$/u.test(name) || bytes.length > MAX_IMAGE_BYTES)
                                throw new Error('Invalid image snapshot');
                            if (this._writtenImages.has(name))
                                continue;
                            const image = this.imageDirectory.get_child(name);
                            await new Promise((resolve, reject) => {
                                image.replace_contents_async(bytes, null, false,
                                    Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION,
                                    null, (file, result) => {
                                        try { resolve(file.replace_contents_finish(result)); } catch (error) { reject(error); }
                                    });
                            });
                            this._writtenImages.add(name);
                        }
                        // A privacy change can occur during an image write.
                        // The queued erase owns cleanup; never recreate JSON.
                        if (!this.persist)
                            continue;
                        await new Promise((resolve, reject) => {
                            this.file.replace_contents_async(new TextEncoder().encode(request.raw), null, false,
                                Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION,
                                null, (file, result) => {
                                    try { resolve(file.replace_contents_finish(result)); } catch (error) { reject(error); }
                                });
                        });
                        await this._cleanupImages(new Set(request.images.keys()));
                    }
                } catch {
                    this.onError(N_('Could not update local history storage. Check directory permissions.'));
                }
            }
        })().finally(() => { this._running = null; });
        return this._running;
    }
}
