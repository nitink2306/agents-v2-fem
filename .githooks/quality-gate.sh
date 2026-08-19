#!/usr/bin/env bash
# Quality gate shared by `.githooks/pre-push` and `npm run gate`.
#
# Typecheck always runs against the whole program (tsc has to see the full
# graph anyway, and it's currently clean). Lint/format only runs against
# files this branch actually touched vs. trunk, on purpose: the repo carries
# pre-existing biome debt, so a repo-wide `biome check .` would block every
# push regardless of what changed. Scoping to the diff keeps the gate
# meaningful for new work without turning into an unrelated mass-reformat.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

status=0

trunk_branch="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
trunk_branch="${trunk_branch:-main}"

git fetch origin "$trunk_branch" --quiet 2>/dev/null

merge_base="$(git merge-base HEAD "origin/$trunk_branch" 2>/dev/null)"
if [ -z "$merge_base" ]; then
  merge_base="$(git rev-parse HEAD~1 2>/dev/null)"
fi

changed_files=""
if [ -n "$merge_base" ]; then
  changed_files="$(git diff --name-only --diff-filter=ACMR "$merge_base" HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' | grep -v '^package-lock.json$' || true)"
fi

echo "== Quality gate: trunk=$trunk_branch =="

if [ -n "$changed_files" ]; then
  echo "-- biome check (changed files only) --"
  # shellcheck disable=SC2086
  if ! npx biome check $changed_files; then
    status=1
  fi
else
  echo "-- biome check: no changed source files vs. $trunk_branch, skipping --"
fi

echo "-- typecheck (tsc --noEmit) --"
if ! npx tsc -p tsconfig.json --noEmit; then
  status=1
fi

if [ "$status" -ne 0 ]; then
  echo ""
  echo "Quality gate FAILED. Fix the issues above (try 'npm run lint:fix' for auto-fixable lint/format problems) before pushing."
else
  echo ""
  echo "Quality gate passed."
fi

exit "$status"
