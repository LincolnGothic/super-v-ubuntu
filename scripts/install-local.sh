#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
if [ "$(id -u)" -eq 0 ]; then
    printf '%s\n' 'Run install-local as your desktop user, without sudo.' >&2
    exit 1
fi
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
task_data=${XDG_DATA_HOME:-"$HOME/.local/share"}
task_extension="$task_data/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local"
mkdir -p "$task_extension"
# Stage only runtime files; do not replace arbitrary directories recursively.
cp "$task_root"/extension/*.js "$task_root"/extension/metadata.json "$task_root"/extension/stylesheet.css "$task_extension/"
mkdir -p "$task_extension/core" "$task_extension/data" "$task_extension/schemas"
cp "$task_root"/extension/core/*.js "$task_extension/core/"
cp "$task_root"/extension/data/emoji.json "$task_root"/vendor/unicode/LICENSE.txt "$task_extension/data/"
cp "$task_root"/extension/schemas/*.xml "$task_extension/schemas/"
glib-compile-schemas --strict "$task_extension/schemas"
printf '%s\n' 'Installed for your user. Log out and back in, then run:'
printf '%s\n' 'gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local'
