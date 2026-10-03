# Development log and workflow

The build workspace inspected on 2026-09-30 was Ubuntu 24.04.3 LTS (Noble),
with no GNOME Shell, GJS, graphical session variables, debhelper, lintian,
ESLint, GLib schema tools or GitHub CLI initially installed. Node 24.19.0,
npm 11.9.0, git 2.51.1 and dpkg-buildpackage 1.22.6 were present. Neither
DISPLAY nor WAYLAND_DISPLAY nor XDG_SESSION_TYPE was set. No desktop runtime
test could be performed. No application sessions or passwords were probed.

Installed distribution tools: GJS 1.80.2, GLib tools 2.80.0, debhelper 13,
lintian 2.117.0ubuntu1.5, ESLint 6.4.0, GitHub CLI 2.45.0, GTK 4.14.5,
libadwaita 1.5.0. System Node 18.19.1 is also tested through Debian packaging.
APT required a writable download cache in this managed environment; no special
permissions are required on a normal Ubuntu development machine.

`gh auth status` reports no authenticated GitHub host. The GitHub connector
identifies LincolnGothic, but does not expose repository creation, token export,
release creation or release-asset upload. The requested repository was not
accessible through the connector (404). CLI authentication and connector
authentication are separate; no credentials were copied or invented.

The architecture was chosen before coding and documented in `architecture.md`.
GNOME's tagged 46.0 headers/JS were inspected; an initial backend seat call was
corrected to `Clutter.get_default_backend().get_default_seat()`. Pure tests,
GJS filesystem tests and mocked async lifecycle tests cover the logic and
privacy boundaries. Generated emoji data matches pinned upstream hashes.
Exact final results are in `verification.md`; desktop tests in `testing.md`.

On 2026-10-01 the user's diagnostics identified Ubuntu 26.04.1 LTS,
GNOME Shell 50.1 and Wayland. Release 0.1.1 adds GNOME 50 after inspecting
tagged Shell/Mutter 50.1 source and the GNOME 47–50 migration guides.
Widget orientation, event actors and backend lookup use current APIs with
GNOME 46 fallbacks. Older Shell's stage-as-focus result is normalized so
application paste is not incorrectly delayed. No user's computer was
accessed from the build container; desktop acceptance remains pending.

## Reproduce a build

Install the README's dependencies, then run `make test` and `make package`.
No npm install is needed. Debian's build uses `/usr/bin/node` so that the
declared distribution dependency, not an incidental newer runtime, is tested.
ESLint uses its unix formatter to avoid a nonessential optional chalk package.
Expected GLib warnings for intentionally rejected out-of-range test settings
are assertions of schema validation, not shell runtime errors.

The native package version is 0.1.8, architecture all. Debhelper performs the
staging, permissions, metadata and archive build. Schemas are compiled into the
extension's private schema directory; no root-time per-user settings changes
or global schema install are needed. Install-local refuses root.

For a downloadable Git bundle, reconstruct the committed checkout with:

```sh
git clone ./super-v-ubuntu.git.bundle super-v-ubuntu
cd super-v-ubuntu
git remote remove origin
```

Then run `gh auth login` and `./scripts/publish.sh` to publish. The source ZIP
is an alternative for reading/building; it does not include Git history.

For a clean build, commit source and clone the checkout into a temporary
directory, build there, and compare the SHA256 of the `.deb` with another clean
build using the same source, dependencies and SOURCE_DATE_EPOCH. dpkg derives
SOURCE_DATE_EPOCH from the fixed changelog date. Buildinfo may differ by path;
the `.deb` should not. Publication uses this clean-checkout procedure.

To inspect settings directly after installation:

```sh
schema_dir=/usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local/schemas
gsettings --schemadir "$schema_dir" list-recursively org.gnome.shell.extensions.super-v-ubuntu
gsettings --schemadir "$schema_dir" reset-recursively org.gnome.shell.extensions.super-v-ubuntu
```

The second command restores preferences, including enabling persistence/capture;
it does not erase clipboard history. Use SECURITY.md for erasure. Use a user
installation's schema path instead if applicable.

## Version changes

Before declaring another GNOME version, inspect its tagged St/Clutter/Mutter
and Shell module interfaces, preferences APIs and modal/focus behavior.
Amend metadata, dependencies and API audit together; record pending desktop
validation explicitly and run the full desktop matrix before claiming tested
runtime support.
Do not use GNOME's version-validation override as evidence of support.
