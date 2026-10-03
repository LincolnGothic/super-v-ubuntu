// SPDX-License-Identifier: GPL-3.0-or-later
// Set the fake engine only in this disposable GTK child, before GTK threads start.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
const directory = Gio.File.new_for_uri(import.meta.url).get_parent().get_path();
GLib.setenv('PATH', `${directory}:${GLib.getenv('PATH')}`, true);
