// SPDX-License-Identifier: GPL-3.0-or-later
import Cairo from 'cairo';
import Gdk from 'gi://Gdk?version=4.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';
import {imageInfo} from './core/image.js';

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
    if (a.type === 'text') {
        const layout = PangoCairo.create_layout(cr);
        layout.set_font_description(Pango.FontDescription.from_string(`Sans ${a.width}`));
        layout.set_text(a.text, -1);
        cr.moveTo(a.x, a.y);
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
    Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0);
    cr.paint();
    for (const annotation of state.annotations)
        drawAnnotation(cr, annotation);
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
