// SPDX-License-Identifier: GPL-3.0-or-later
import {dgettext} from 'gettext';

// GNOME initializes this domain from metadata.json in both Shell and prefs.
// Explicit domain lookup also lets isolated GJS/Shell checks use these modules.
export const gettext = message => dgettext('super-v-ubuntu', message);
