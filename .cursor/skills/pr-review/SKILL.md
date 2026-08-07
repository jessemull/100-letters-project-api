---
name: pr-review
description: >-
  Review PRs for the 100 Letters Project API: diff-first, severity-tiered task lists.
---

# PR review

- Severity: `docs/REVIEW.md` (MUST / SHOULD / NICE / OUT OF SCOPE / VERIFY)
- Skim `CONTEXT.md` + `AGENTS.md`; load domain docs when touched
- Diff-first; one bullet = one task; fixed sections; `(no items)` when empty; no hedging
- Gather: `git fetch` + log/diff against base branch
- Output: Scope → Architecture → Files changed → Reviewed areas → MUST/SHOULD/NICE/OUT OF SCOPE/VERIFY → Strengths → Test plan → Verification
- Bullet form: `` `path:line` — imperative task ``
- Companions: security-review, testing, lambda-packaging, api-contract
