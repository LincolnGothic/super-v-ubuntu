#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# Explicitly invoked by the owner to publish a PUBLIC source repo and release.
set -eu
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$task_root"
gh auth status
gh auth setup-git --hostname github.com
test "$(git branch --show-current)" = main || { printf '%s\n' 'Switch to main first.' >&2; exit 1; }
test -z "$(git status --porcelain)" || { printf '%s\n' 'Commit source changes before publishing.' >&2; exit 1; }
make test
task_owner=$(gh api user --jq .login)
task_repo="$task_owner/super-v-ubuntu"
task_expected="https://github.com/$task_repo.git"
if gh repo view "$task_repo" --json nameWithOwner >/dev/null 2>&1; then
    test "$(gh repo view "$task_repo" --json visibility --jq .visibility)" = PUBLIC || {
        printf '%s\n' 'Existing repository is not public; refusing to change its visibility.' >&2; exit 1;
    }
    if git remote get-url origin >/dev/null 2>&1; then
        task_origin=$(git remote get-url origin)
        case "$task_origin" in "$task_expected"|"https://github.com/$task_repo"|"git@github.com:$task_repo.git") ;;
            *) printf '%s\n' 'origin points to a different repository.' >&2; exit 1;; esac
    else
        git remote add origin "$task_expected"
    fi
    git push -u origin main
else
    test -z "$(git remote)" || { printf '%s\n' 'Review existing remotes before creating a repository.' >&2; exit 1; }
    gh repo create "$task_repo" --public --description 'Local clipboard history and Unicode emoji picker for GNOME Shell 46 and 50' --source . --remote origin --push
fi
task_sha=$(git rev-parse HEAD)
git remote -v
git ls-remote --exit-code origin refs/heads/main
gh repo view "$task_repo" --json url,visibility,defaultBranchRef
task_run=''
for task_attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    task_run=$(gh run list --repo "$task_repo" --commit "$task_sha" --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId // empty')
    test -z "$task_run" || break
    sleep 5
done
test -n "$task_run" || { printf '%s\n' 'No CI run found; release was not created. Check GitHub Actions.' >&2; exit 1; }
gh run watch "$task_run" --repo "$task_repo" --exit-status
task_temp=$(mktemp -d)
trap 'rm -rf "$task_temp"' EXIT HUP INT TERM
git clone --quiet --no-local "$task_root" "$task_temp/source"
git -C "$task_temp/source" checkout --quiet "$task_sha"
(cd "$task_temp/source" && make package)
lintian --fail-on error,warning "$task_temp/super-v-ubuntu_0.1.2_all.deb"
mkdir -p "$task_root/artifacts"
cp "$task_temp/super-v-ubuntu_0.1.2_all.deb" "$task_root/artifacts/"
(cd "$task_root/artifacts" && sha256sum super-v-ubuntu_0.1.2_all.deb > SHA256SUMS)
if git rev-parse v0.1.2 >/dev/null 2>&1; then
    test "$(git rev-list -n 1 v0.1.2)" = "$task_sha" || { printf '%s\n' 'Existing v0.1.2 tag differs from main.' >&2; exit 1; }
else
    git tag -a v0.1.2 -m 'Super V Ubuntu 0.1.2'
fi
git push origin v0.1.2
gh release create v0.1.2 artifacts/super-v-ubuntu_0.1.2_all.deb artifacts/SHA256SUMS \
    --repo "$task_repo" --verify-tag --title 'Super V Ubuntu 0.1.2' --notes-file docs/release-notes.md
gh release view v0.1.2 --repo "$task_repo" --json url,isDraft,assets,tagName
mkdir "$task_temp/verify"
gh release download v0.1.2 --repo "$task_repo" --dir "$task_temp/verify" --pattern '*.deb' --pattern SHA256SUMS
(cd "$task_temp/verify" && sha256sum --check SHA256SUMS)
git status --short
git log -1 --format='%H %s'
