#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Uses a fresh headless compositor; never loads code into the user's desktop.
set -euo pipefail
task_base=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
for task_language in ${SUPER_V_TEST_LANGUAGES:-en zh_CN zh_TW ja es fr ko}; do
    task_session=$(mktemp -d)
    mkdir -p "$task_session/runtime" "$task_session/config" "$task_session/data" "$task_session/cache" "$task_session/state" "$task_session/pictures" "$task_session/videos"
    chmod 700 "$task_session/runtime"
    printf 'XDG_PICTURES_DIR="%s"\nXDG_VIDEOS_DIR="%s"\n' "$task_session/pictures" "$task_session/videos" > "$task_session/config/user-dirs.dirs"
    (
        export XDG_RUNTIME_DIR="$task_session/runtime" XDG_CONFIG_HOME="$task_session/config"
        export XDG_DATA_HOME="$task_session/data" XDG_CACHE_HOME="$task_session/cache"
        export XDG_STATE_HOME="$task_session/state" GDK_BACKEND=wayland GSK_RENDERER=cairo
        export GSETTINGS_BACKEND=memory LIBGL_ALWAYS_SOFTWARE=1
        export LANGUAGE="$task_language" LC_ALL=en_US.UTF-8
        printf 'Language: %s\n' "$task_language"
        timeout 45s dbus-run-session -- gnome-shell --headless --wayland --no-x11 \
            --virtual-monitor=1280x960 --mode=user --automation-script="$task_base/tests/shell.test.js" \
            2>&1 | tee "$task_session/shell.log"
        rg 'SHELL CHECKS COMPLETE' "$task_session/shell.log"
    )
    rm -rf "$task_session"
done
