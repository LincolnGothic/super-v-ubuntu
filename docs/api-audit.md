# GNOME 46 and 50 API audit

Source inspection performed against upstream **46.0** and **50.1**.
These are API requirements, not GUI test results. The 50.1 audit was performed
on 2026-10-01 after the user's desktop diagnostics identified that version.

| Interface | Upstream source inspected | Use |
|---|---|---|
| ModalDialog constructor, `open`, `close`, `State`, `setInitialKeyFocus` | https://github.com/GNOME/gnome-shell/blob/46.0/js/ui/modalDialog.js | Reusable modal St shell popup, no fade or lightbox |
| `St.ScrollView.set_child` | https://github.com/GNOME/gnome-shell/blob/46.0/src/st/st-scroll-view.h | Scrollable bounded results |
| `Meta.Selection.get_mimetypes`, `transfer_async`, `transfer_finish` | https://github.com/GNOME/mutter/blob/46.0/src/meta/meta-selection.h | Byte-bounded asynchronous text transfer |
| Selection owner change signature/type | https://github.com/GNOME/mutter/blob/46.0/src/core/meta-selection.c | Clipboard-only change monitoring |
| `Clutter.get_default_backend().get_default_seat().create_virtual_device`, `notify_keyval` | https://github.com/GNOME/gnome-shell/blob/46.0/js/ui/keyboard.js | Focus-checked virtual keyboard paste |
| Extension ES-module imports and keybindings | https://gjs.guide/extensions/upgrading/gnome-shell-45.html | Modern imports inherited by GNOME 46 |
| GNOME 46 changes | https://gjs.guide/extensions/upgrading/gnome-shell-46.html | St expand flags, no removed Clutter.Container APIs |

The GNOME 50.1 audit inspected the following tagged sources:

| Interface | Upstream source inspected | Result |
|---|---|---|
| Modal dialog constructor, open/close, focus and state | https://github.com/GNOME/gnome-shell/blob/50.1/js/ui/modalDialog.js | Existing parameters and reusable lifecycle retained |
| Box orientation and deprecated vertical property | https://github.com/GNOME/gnome-shell/blob/50.1/src/st/st-box-layout.c | Use `orientation` where `set_orientation` exists; GNOME 46 uses `vertical` |
| Scroll child and vertical adjustment | https://github.com/GNOME/gnome-shell/blob/50.1/src/st/st-scroll-view.h | Both APIs retained |
| Clipboard getter/setter | https://github.com/GNOME/gnome-shell/blob/50.1/src/st/st-clipboard.h | Existing text clipboard API retained |
| Selection MIME types and bounded async transfer | https://github.com/GNOME/mutter/blob/50.1/src/meta/meta-selection.h | Existing signatures retained |
| Clipboard selection enum | https://github.com/GNOME/mutter/blob/50.1/src/meta/meta-selection-source.h | `META_SELECTION_CLIPBOARD` retained |
| Selection owner signal | https://github.com/GNOME/mutter/blob/50.1/src/core/meta-selection.c | Selection type and owner parameters retained |
| Stage context, seat, virtual keyboard and event actor | https://github.com/GNOME/gnome-shell/blob/50.1/js/ui/keyboard.js | Use `global.stage.context.get_backend()` and `global.stage.get_event_actor()` when available |
| Input device creation and key notification | https://github.com/GNOME/mutter/blob/50.1/clutter/clutter/clutter-seat.h and https://github.com/GNOME/mutter/blob/50.1/clutter/clutter/clutter-virtual-input-device.h | Existing virtual keyboard APIs retained |
| Event type, key symbol and modifiers | https://github.com/GNOME/mutter/blob/50.1/clutter/clutter/clutter-event.h | Existing event methods retained |
| Activate target window | https://github.com/GNOME/gnome-shell/blob/50.1/js/ui/main.js | Existing `activateWindow` helper retained |
| Extension and preferences base classes | https://github.com/GNOME/gnome-shell/blob/50.1/js/extensions/extension.js and https://github.com/GNOME/gnome-shell/blob/50.1/js/extensions/prefs.js | Existing lifecycle and preferences APIs retained |
| Default notification shortcut | https://github.com/GNOME/gnome-shell/blob/50.1/data/org.gnome.shell.gschema.xml.in | Super+V and Super+M both belong to notifications; documented user setup reserves Super+V |
| Upgrade changes across GNOME 47–50 | https://gjs.guide/extensions/upgrading/gnome-shell-48.html and https://gjs.guide/extensions/upgrading/gnome-shell-50.html | Normalize pre-48 stage-as-focus and migrate deprecated widget orientation |

Eight new regression checks cover compatibility decisions and the actual
paste adapter on both backend paths. They use original API mocks and do not
execute Mutter virtual input or St widgets. No upstream implementation source
is included in the extension. The old widget `vertical` property still exists
in the tagged 50.1 source but is deprecated; its migration is preventative.

GTK4's accelerator parser/validator and libadwaita 1.5 preference row classes
were exercised/inspected in actual GJS integration tests. Gio state persistence
was tested against the installed GLib 2.80. No St/Clutter widgets, real clipboard
signals or virtual input were executed in GNOME Shell in this workspace.
GNOME 46 and 50 are enabled in metadata and permitted by Debian dependencies.
Actual Shell desktop behavior on both targets is NOT TESTED here. GNOME
47–49, 51+ and X11 are not declared supported.
