# Local verification record — 2026-10-01

This is the historical local-build record from before GitHub publication.
For current publication and CI status, see
[the repository](https://github.com/LincolnGothic/super-v-ubuntu),
[Actions](https://github.com/LincolnGothic/super-v-ubuntu/actions), and
[releases](https://github.com/LincolnGothic/super-v-ubuntu/releases).
The workflow publishes an installer only after its automated build checks pass.
Desktop acceptance testing remains separate from CI.

The project is implemented and packaged. Production desktop acceptance is
pending because this environment does not have an interactive GNOME session.
Targets are Ubuntu 24.04 LTS / GNOME Shell 46 and Ubuntu 26.04 LTS / GNOME
Shell 50, using Wayland. GNOME 50.1 source APIs were inspected after receiving
the user's Ubuntu 26.04.1 / GNOME 50.1 / Wayland diagnostics. Tested GUI
support has not been established. GNOME 47–49, 51+ and X11 are not declared.

| Verification | Result | Evidence |
|---|---|---|
| Node unit and actual-adapter mock tests | PASS | 97 passed, 0 failed, under Node 24.19.0 and the Debian build's Node 18.19.1 |
| GNOME 46/50 compatibility regression tests | PASS | Modern/legacy widget properties, event actor lookup, stage focus normalization and actual paste adapter context backend path |
| GJS/Gio integration | PASS | 17 checks passed, 0 failed, GJS 1.80.2 |
| JavaScript syntax / extension metadata | PASS | `scripts/validate.js` |
| GSettings validation | PASS | Strict schema compilation; actual defaults and range rejection tested |
| Unicode database completeness and provenance | PASS | 3,944 Emoji 17.0 records, pinned input hashes and byte-identical generation |
| ESLint | PASS | No findings with configured rules |
| Shell script syntax / Python compilation | PASS | `sh -n`, `python3 -m py_compile` |
| Debian package build | PASS | debhelper/dpkg-buildpackage produced `super-v-ubuntu_0.1.1_all.deb`, version 0.1.1, architecture all |
| lintian | PASS | Exit 0, no errors or warnings; only informational root-execution notice |
| Package contents, schemas and permissions | PASS | `dpkg-deb --info`, `--contents`, and package audit script |
| Runtime source privacy/security audit | PASS | No runtime network/subprocess/eval calls, clipboard logs, credentials or workspace paths found; actual private-file and symlink tests passed |
| Clean-checkout reproducibility | PASS | Two independent clean clones built byte-identical `.deb` files, verified with SHA256 and `cmp` |
| Local Git source commits | PASS | Source committed on main; clean worktree, executable script modes preserved in Git |
| GitHub CLI authentication | FAIL | `gh auth status`: not logged in |
| Remote repository / push / PUBLIC visibility | NOT TESTED | Connector recognizes LincolnGothic but exposes no repo creation; repository lookup returned 404 |
| GitHub Actions | NOT TESTED | Workflow created, not executed remotely |
| GitHub Release / uploaded asset | NOT TESTED | No release-creation/upload capability and no CLI authentication |
| Real Wayland Super+V / rendering / focus return / paste | NOT TESTED | No GNOME graphical session |
| Text Editor, Terminal and Firefox insertion | NOT TESTED | No application desktop sessions |
| Light/dark, HiDPI, multi-monitor, lock/unlock GUI behavior | NOT TESTED | Manual matrix in `docs/testing.md` |

Total current automated behavioral checks: **114 passed, 0 failed** (97 Node
tests plus 17 GJS checks). Counts exclude syntax/schema/generation/lint/package
audits. Mock clipboard/virtual-keyboard tests are not real GNOME tests.

The expected future repository is `LincolnGothic/super-v-ubuntu` only if
LincolnGothic is also the account authenticated in gh when publication is run.
No repository URL or release URL is presented as an existing publication.
Run `gh auth login` and `./scripts/publish.sh` from this committed checkout to
create/push a public repository, wait for CI, build a clean release and verify
the uploaded `.deb`. The script will stop on required CI or lintian failures.

The publication script's unauthenticated guard was exercised: it exited 1
without creating a remote, pushing, or publishing a release. That guard test
does not verify the subsequent authenticated publishing workflow.

Install locally on the target desktop:

```sh
sudo apt install ./super-v-ubuntu_0.1.1_all.deb
```

Log out/in, then:

```sh
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
```

Limits: text-only history; 16 KiB per entry and 2 MiB total; up to 500 ordinary
entries/100 pins; best-effort sensitive-source exclusions; clipboard-based
emoji insertion with explicit restoration; no nontext clipboard snapshot;
font-dependent emoji glyphs; English keywords; receiving applications may
need configured paste shortcuts. Desktop behavior must pass the manual matrix
before this project can be called fully verified for daily use.
