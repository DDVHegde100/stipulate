#!/usr/bin/env sh
# Commit with canonical maintainer identity — never Cursor co-authorship.
set -euo pipefail

export GIT_AUTHOR_NAME="ddvhegde100"
export GIT_AUTHOR_EMAIL="ddvhegde100@users.noreply.github.com"
export GIT_COMMITTER_NAME="ddvhegde100"
export GIT_COMMITTER_EMAIL="ddvhegde100@users.noreply.github.com"

git commit "$@"
