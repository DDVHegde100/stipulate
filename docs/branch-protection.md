# Branch Protection & Git Conventions

## Branch strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | production |
| `staging` | Pre-release integration | staging |
| `feat/*` | Feature branches | preview (optional) |
| `fix/*` | Bug fixes | — |

## Required branch protection on `main`

Configure in GitHub → Settings → Branches → Add rule for `main`:

### Required settings

- [x] **Require a pull request before merging**
  - Required approvals: **1**
  - Dismiss stale pull request approvals when new commits are pushed
- [x] **Require status checks to pass before merging**
  - Required checks:
    - `CI / lint`
    - `CI / typecheck`
    - `CI / test`
    - `CI / build`
- [x] **Require branches to be up to date before merging**
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings** (include admins)
- [x] **Restrict force pushes** — disabled on `main`
- [x] **Restrict deletions** — enabled

### Recommended settings

- [x] Require linear history (squash merge preferred)
- [x] Automatically delete head branches after merge

## Commit message convention

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

```
type(scope): short description in lowercase

feat(api): add cap-aware routing for quarterly limits
fix(mcc): correct uber eats mcc override for amex
docs(readme): update local dev setup instructions
chore(deps): bump hono to 4.7.2
```

### Allowed types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Rules

- Subject max 72 characters
- Subject lowercase (proper nouns excepted)
- No period at end of subject
- Body optional, wrap at 100 chars

## Pull request template

PRs should include:

1. **What** — one sentence summary
2. **Why** — business or technical motivation
3. **Test plan** — checklist of manual/automated verification
4. **Screenshots** — for UI changes

## Release process

1. Merge feature PRs to `staging`
2. Run full test suite + smoke test on staging
3. Open PR `staging` → `main`
4. Tag release: `git tag v0.x.y && git push origin v0.x.y`
5. GitHub Actions deploys production on tag push

## CODEOWNERS (recommended)

```
/apps/api/          @ddvhegde100
/apps/web/          @ddvhegde100
/packages/parser/   @ddvhegde100
/packages/mcc/      @ddvhegde100
/.github/           @ddvhegde100
```
