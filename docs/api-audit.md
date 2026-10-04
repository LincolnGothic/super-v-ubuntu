# GNOME 46, 48 and 50 API audit

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

## GNOME 48 / Debian 13 and screenshot tools

The 2026-10-03 audit inspected these tagged upstream 48.0 sources:

| Interface | Source | Result |
| --- | --- | --- |
| Reusable modal popup | [modalDialog.js](https://github.com/GNOME/gnome-shell/blob/48.0/js/ui/modalDialog.js) | Open, close, state, and focus APIs retained |
| Orientation | [st-box-layout.h](https://github.com/GNOME/gnome-shell/blob/48.0/src/st/st-box-layout.h) | Current orientation API; feature detection keeps the 46 fallback |
| Stage seat and input | [keyboard.js](https://github.com/GNOME/gnome-shell/blob/48.0/js/ui/keyboard.js) | Stage context backend and virtual input paths retained |
| Bounded clipboard transfer | [meta-selection.h](https://github.com/GNOME/mutter/blob/48.0/src/meta/meta-selection.h) | MIME and async transfer signatures retained |
| Capture notifications | [screenshot.js](https://github.com/GNOME/gnome-shell/blob/48.0/js/ui/screenshot.js) | Screenshot UI and completion/close signals retained |
| Chrome and monitor work areas | [layout.js](https://github.com/GNOME/gnome-shell/blob/48.0/js/ui/layout.js) | Temporary pin overlays can use addChrome/removeChrome and monitor signals |
| Separate GTK preferences | [prefs.js](https://github.com/GNOME/gnome-shell/blob/48.0/js/extensions/prefs.js) | Existing base class retained |
| Pin image texture | [48.0 st-image-content.h](https://github.com/GNOME/gnome-shell/blob/48.0/src/st/st-image-content.h), [46.0 header](https://github.com/GNOME/gnome-shell/blob/46.0/src/st/st-image-content.h) | 48+ set_bytes requires a Cogl context; 46 inherits Clutter.Image without that argument |

Pin drags use the grab actor's captured-event handler. Grabbing an actor changes
the capture root, so a handler connected only to the stage misses subsequent
motion. The native pointer regression test exercises press, motion, and release.

GJS TextDecoder does not implement the stream option. Editor protocol frames
are accumulated as bounded bytes until newline, then decoded as complete UTF-8.
A native split-code-point test and full screenshot copy test cover this path.
Tesseract receives stdin and returns stdout through owned GLib.Bytes writes;
no shell interpolation or scratch image is involved. See the upstream
[Tesseract command-line guide](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html).

Metadata declares GNOME 46, 48, and 50. CI runs actual isolated Wayland sessions
on Ubuntu 24.04, Ubuntu 26.04, and Debian 13, for native amd64 and arm64. Source
inspection is distinct from these runtime checks and interactive desktop acceptance;
executed results are recorded in verification-v0.1.8.md. GNOME 47, 49, 51+, X11,
and other desktops are not declared supported.

## v0.1.9 fresh area selection

Super V imports the exported `SelectArea` from GNOME’s screenshot module, constructs
one per request and awaits `selectAsync()`. The rubberband starts hidden, Escape
cancels, and the selector becomes transparent and schedules destruction before
returning its rectangle. The caller waits an idle before `Shell.Screenshot.screenshot_area`
and writes to a `Gio.MemoryOutputStream`. `SelectArea` and its GrabHelper field were
inspected in the official [46.0](https://github.com/GNOME/gnome-shell/blob/46.0/js/ui/screenshot.js),
[48.0](https://github.com/GNOME/gnome-shell/blob/48.0/js/ui/screenshot.js) and
[50.0](https://github.com/GNOME/gnome-shell/blob/50.0/js/ui/screenshot.js) source.
Version 50 uses a native pan gesture; older versions use pointer event methods.
CI exercises actual native pointer input on every supported version and CPU.
The extension cancels an active selector through its existing GrabHelper, without
patching the shared screenshot UI or changing Print Screen behavior.

## v0.1.12 popup visibility

The popup uses Clutter Stage's `after-paint` signal to apply placement after
allocation finishes. A single pending signal handler is disconnected before it
runs; missing or resized layout schedules the next frame, and close/destroy
cancels the handler. Unchanged translation and opacity values are not written.
The fix-only CI matrix exercised this path on GNOME 46, 48, and 50, on both
amd64 and arm64, including seven-language and 720p placement sessions.

## v0.1.11 popup placement

GNOME 50.1's [native event dispatcher](https://github.com/GNOME/mutter/blob/50.1/src/core/events.c)
updates window user time for button presses before client input consumes the
Clutter event. [Window user-time updates](https://github.com/GNOME/mutter/blob/50.1/src/core/window.c)
notify the GObject property. Super V observes that notification only when the
primary button is down and that window has the pointer, avoiding an input grab
or polling timer. Window closure and popup destruction disconnect the observers.

The visible panel's allocation is distinct from its modal wrapper. Placement uses
[transform_stage_point](https://gnome.pages.gitlab.gnome.org/mutter/clutter/method.Actor.transform_stage_point.html)
to convert screen coordinates into the parent's coordinates, then subtracts the
panel's own allocation. A compositor BEFORE_REDRAW callback defers placement
until layout is current. Native regressions exercise this path on all supported
GNOME versions, including reopening every tab at screen edges on a 720p monitor.
