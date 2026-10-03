// SPDX-License-Identifier: GPL-3.0-or-later
import Cairo from 'cairo';
import Gdk from 'gi://Gdk?version=4.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';
import {imageInfo} from './core/image.js';

const grayscaleImages = new WeakMap();

function grayscale(pixbuf) {
    let result = grayscaleImages.get(pixbuf);
    if (!result) {
        result = pixbuf.copy();
        pixbuf.saturate_and_pixelate(result, 0, false);
        grayscaleImages.set(pixbuf, result);
    }
    return result;
}

function drawMosaic(cr, a) {
    // A small repeating tile keeps work bounded even for large diagonal strokes.
    // Every painted pixel is opaque; the original image does not supply its colors.
    const block = a.block ?? 12;
    const tile = new Cairo.ImageSurface(Cairo.Format.RGB24, block * 4, block * 4);
    const brush = new Cairo.Context(tile);
    try {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const shade = [1, 0.96, 0.92, 0.88][(x * 3 + y * 5 + x * y) % 4];
                brush.setSourceRGB(shade, shade, shade);
                brush.rectangle(x * block, y * block, block, block);
                brush.fill();
            }
        }
        const pattern = new Cairo.SurfacePattern(tile);
        pattern.setExtend(Cairo.Extend.REPEAT);
        pattern.setFilter(Cairo.Filter.NEAREST);
        cr.setSource(pattern);
        cr.setAntialias(Cairo.Antialias.NONE);
        if (a.x === a.x2 && a.y === a.y2 && !a.points.some(p => p[0] !== a.x || p[1] !== a.y)) {
            cr.arc(a.x, a.y, a.width / 2, 0, Math.PI * 2);
            cr.fill();
        } else {
            cr.moveTo(a.x, a.y);
            for (const point of a.points) cr.lineTo(...point);
            cr.lineTo(a.x2, a.y2);
            cr.stroke();
        }
    } finally {
        brush.$dispose();
        tile.finish();
    }
}

export function decodeImage(bytes, mime) {
    const info = imageInfo(bytes, mime);
    const loader = GdkPixbuf.PixbufLoader.new_with_mime_type(mime);
    try {
        loader.write(bytes);
        loader.close();
        const pixbuf = loader.get_pixbuf();
        if (!pixbuf || pixbuf.width !== info.width || pixbuf.height !== info.height)
            throw new Error('Invalid decoded dimensions');
        return pixbuf;
    } catch (error) {
        try { loader.close(); } catch { /* Release a failed decoder. */ }
        throw error;
    }
}

export function drawAnnotation(cr, a) {
    cr.save();
    const rgb = [1, 3, 5].map(offset => parseInt(a.color.slice(offset, offset + 2), 16) / 255);
    cr.setSourceRGBA(...rgb, a.type === 'highlight' ? 0.3 : 1);
    cr.setLineWidth(a.width);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineJoin(Cairo.LineJoin.ROUND);
    const x = Math.min(a.x, a.x2), y = Math.min(a.y, a.y2);
    const width = Math.abs(a.x2 - a.x), height = Math.abs(a.y2 - a.y);
    if (a.type === 'mosaic') {
        drawMosaic(cr, a);
    } else if (a.type === 'text') {
        const layout = PangoCairo.create_layout(cr);
        const font = Pango.FontDescription.from_string('Sans');
        font.set_absolute_size(a.width * Pango.SCALE);
        layout.set_font_description(font);
        layout.set_text(a.text, -1);
        cr.moveTo(a.x, a.y);
        PangoCairo.show_layout(cr, layout);
    } else if (a.type === 'number') {
        const radius = Math.max(10, a.width * 0.8);
        cr.arc(a.x, a.y, radius, 0, 2 * Math.PI);
        cr.fill();
        const layout = PangoCairo.create_layout(cr);
        const font = Pango.FontDescription.from_string('Sans Bold');
        font.set_absolute_size(Math.max(10, radius * 1.1) * Pango.SCALE);
        layout.set_font_description(font);
        layout.set_text(String(a.number), -1);
        const [, logical] = layout.get_pixel_extents();
        cr.setSourceRGB(1, 1, 1);
        cr.moveTo(a.x - logical.width / 2 - logical.x, a.y - logical.height / 2 - logical.y);
        PangoCairo.show_layout(cr, layout);
    } else if (['rectangle', 'redact', 'highlight'].includes(a.type)) {
        cr.rectangle(x, y, width, height);
        if (a.type === 'rectangle') {
            cr.stroke();
        } else {
            if (a.type === 'redact') {
                // Opaque pixels, with no transparent edge exposing the source.
                cr.setAntialias(Cairo.Antialias.NONE);
                cr.setSourceRGB(0, 0, 0);
                cr.newPath();
                cr.rectangle(Math.floor(x), Math.floor(y), Math.ceil(x + width) - Math.floor(x),
                    Math.ceil(y + height) - Math.floor(y));
            }
            cr.fill();
        }
    } else if (a.type === 'pen') {
        cr.moveTo(a.x, a.y);
        for (const point of a.points)
            cr.lineTo(...point);
        cr.lineTo(a.x2, a.y2);
        cr.stroke();
    } else if (a.type === 'arrow') {
        cr.moveTo(a.x, a.y);
        cr.lineTo(a.x2, a.y2);
        cr.stroke();
        const angle = Math.atan2(a.y2 - a.y, a.x2 - a.x);
        const head = Math.max(10, a.width * 3);
        for (const delta of [-0.5, 0.5]) {
            cr.moveTo(a.x2, a.y2);
            cr.lineTo(a.x2 - head * Math.cos(angle + delta), a.y2 - head * Math.sin(angle + delta));
        }
        cr.stroke();
    }
    cr.restore();
}

export function drawDocument(cr, pixbuf, state, preview = null) {
    const c = state.crop;
    cr.save();
    cr.rectangle(0, 0, c.width, c.height);
    cr.clip();
    cr.translate(-c.x, -c.y);
    Gdk.cairo_set_source_pixbuf(cr, state.grayscale ? grayscale(pixbuf) : pixbuf, 0, 0);
    cr.paint();
    for (const annotation of state.annotations) {
        if (!preview?.id || preview.id !== annotation.id)
            drawAnnotation(cr, annotation);
    }
    if (preview)
        drawAnnotation(cr, {...preview, type: preview.type === 'crop' ? 'rectangle' : preview.type});
    cr.restore();
}

export function exportPng(pixbuf, state) {
    const {width, height} = state.crop;
    const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, width, height);
    const cr = new Cairo.Context(surface);
    try {
        drawDocument(cr, pixbuf, state);
        const output = Gdk.pixbuf_get_from_surface(surface, 0, 0, width, height);
        const bytes = output.save_to_bufferv('png', [], [])[1];
        imageInfo(bytes, 'image/png');
        return bytes;
    } finally {
        cr.$dispose();
        surface.finish();
    }
}
