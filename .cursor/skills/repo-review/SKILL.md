---
name: repo-review
description: >-
  Full-repo audit for the 100 Letters Project API using REVIEW.md severity tiers.
  Use for release readiness or compliance sweeps.
---

# Repo review

Same severity/bullet format as `pr-review`, but **repo-wide**.

1. Read mandatory docs from `CONTEXT.md`.
2. Enumerate `src/`, `scripts/`, `cloudformation/`, `templates/`, `.github/workflows/`.
3. Priorities: correctness → Lambda packaging → API contract/auth → security/secrets → multi-package maintainability → CI drift.
4. Output sections: Scope → Architecture → Areas reviewed → MUST / SHOULD / NICE / OUT OF SCOPE / VERIFY → Strengths → Verdict (Ready / Needs work).
5. Include VERIFY items for: live authorizer vs OpenAPI; CFN deploy order; SDK v2 residual; coverage HTML scrape fragility; zip layout vs Handler paths.
6. One bullet = one task; `` `path:line` — imperative ``.
