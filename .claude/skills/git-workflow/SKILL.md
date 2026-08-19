---
name: git-workflow
description: "End-to-end workflow for shipping a piece of work in this repo: sync the current branch, branch off trunk, run the local quality gate, commit, push (the pre-push hook re-runs the gate), open a PR with gh, then stop and hand off for human review. Use when the user says things like ship this, push my changes, open/create a PR, put this up for review, or wrap up this change — for any normal feature/fix/chore work in this repo. Does NOT cover the course's lesson-branch content-stripping process in CLAUDE.md (Course Development Workflow) — that has its own explicit steps and takes precedence for that task."
---

# Git workflow

How work leaves this machine: **sync → branch → code → gate → commit → push (gate re-runs) → PR → stop.** A human reviews and merges on GitHub. Nothing in this skill merges a PR or pushes straight to trunk.

## Guardrails (non-negotiable)

- **Never merge a PR, approve a PR, or push directly to the trunk branch.** The user reviews and merges on GitHub themselves — that's the whole point of this workflow.
- **Never use `git push --no-verify`** to skip the quality gate unless the user explicitly asks for it in this conversation. If the gate fails, fix the fault instead.
- **Never force-push a branch someone else may have pulled**, and never force-push trunk. A plain force-push to your own just-created feature branch (e.g. after a rebase you did) is fine.
- **Never resolve real conflicts unilaterally during a sync.** Fast-forward or rebase only when it applies cleanly. If it doesn't, stop and surface it to the user instead of picking sides in a merge conflict.
- If the current branch already *is* trunk, don't commit work there — cut a feature branch first (see below).

## 0. Find trunk

Don't hardcode a branch name. Detect it:

```bash
git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
```

In this repo that currently resolves to `my-journey` — but detect it fresh each time rather than assuming, since it can change.

## 1. Sync the current branch

Before doing anything else — whether resuming a branch already in progress or about to cut a new one — fetch and bring the current branch up to date, but only when it's safe:

```bash
git fetch origin
```

- If the branch has an upstream and it can fast-forward cleanly, fast-forward: `git merge --ff-only @{u}`.
- Otherwise, if trunk has moved on since the branch was created, try rebasing onto it: `git rebase origin/<trunk>` — but only if it applies with no conflicts.
- If neither a fast-forward nor a clean rebase is possible — genuine conflicting changes — stop and surface it to the user rather than resolving conflicts unilaterally.

Do this even for a branch you created earlier in this same session: trunk (or the branch's own upstream) can move under you while you work — e.g. another PR merges — and a stale base leads to a PR opened against an out-of-date trunk or a gate/hook setup that silently doesn't apply. Skip only when the branch is brand new with no upstream yet.

## 2. Branch

If you're on trunk (or an unrelated branch) and about to start new work, cut a feature branch from up-to-date trunk:

```bash
git fetch origin <trunk>
git checkout -b <type>/<short-description> origin/<trunk>
```

Branch prefix follows conventional-commit types: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`. Keep the description short and kebab-case, e.g. `feat/streaming-tool-approval`.

If work is already in progress on a sensible branch, keep using it — don't rebrand branches mid-task.

## 3. Do the work

Implement the change as normal.

## 4. Run the gate before committing

```bash
npm run gate
```

This runs `biome check` scoped to the files this branch changed vs. trunk (not the whole repo — this codebase carries pre-existing lint/format debt outside the scope of most changes, so the gate only holds *new* work to the bar), plus a full `tsc --noEmit` typecheck. Fix anything it flags — `npm run lint:fix` handles the auto-fixable formatting/lint issues. Running it here is just fast local feedback; the same script runs again automatically on push.

## 5. Commit

Conventional commit style, why-focused body when the change isn't self-explanatory:

```bash
git add <files>
git commit -m "$(cat <<'EOF'
feat: short imperative summary

Longer explanation if needed — why, not what.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

Don't `git add -A`/`git add .` blindly — check `git status` first so you don't sweep up unrelated in-progress files.

## 6. Push

```bash
git push -u origin <branch>
```

The `pre-push` hook (`.githooks/pre-push`, wired up via `npm install` → the `prepare` script → `git config core.hooksPath .githooks`) runs `npm run gate` again automatically and **blocks the push** if it fails. That's the enforcement point — step 4 is just so you find out sooner. If the hook blocks you, fix and push again; don't reach for `--no-verify`.

## 7. Open the PR

```bash
gh pr create --base <trunk> --title "<short imperative title>" --body "$(cat <<'EOF'
## Summary
- <1-3 bullets on what changed and why>

## Test plan
- [ ] <how this was/should be verified>
EOF
)"
```

Target `--base <trunk>` explicitly (don't rely on gh's default if it might guess wrong). Report the PR URL to the user.

## 8. Stop and hand off

Once the PR is open, **stop**. The user reviews and merges on GitHub. Do not poll for approval, do not merge, do not push further commits unless asked.

## 9. Addressing review feedback

If the user comes back with review comments or asks for changes: repeat steps 3–6 on the same branch (new commits, not amends of pushed commits, unless the user asks you to squash/rebase). The gate runs again on every push, so fixes get the same scrutiny as the original change.
