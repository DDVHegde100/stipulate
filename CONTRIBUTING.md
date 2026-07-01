# Contributing to Stipulate

## Git identity

All commits in this repository MUST be authored by the maintainer GitHub account:

- **Name:** `ddvhegde100`
- **Email:** `ddvhegde100@users.noreply.github.com`

Use the repository commit wrapper:

```bash
pnpm commit -m "feat(api): your change"
```

Or export identity explicitly:

```bash
export GIT_AUTHOR_NAME=ddvhegde100
export GIT_AUTHOR_EMAIL=ddvhegde100@users.noreply.github.com
export GIT_COMMITTER_NAME=ddvhegde100
export GIT_COMMITTER_EMAIL=ddvhegde100@users.noreply.github.com
git commit -m "feat(api): your change"
```

Husky hooks strip `Co-authored-by: Cursor` trailers and reject them in `commit-msg`.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` via the `commit-msg` hook.

```
<type>(<scope>): <subject>

<body>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Pre-commit checks

`pre-commit` runs typecheck on changed packages via Turborepo.

## Pull requests

1. Branch from `main`
2. Ensure `pnpm typecheck`, `pnpm test`, and `pnpm lint` pass
3. Update relevant docs in `docs/` for operational changes
