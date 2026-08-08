# REVIEW.md

> Severity tiers for PR and repo reviews. Skills define fixed output section shapes; this file defines severity meaning.

---

## Severity tiers

### MUST (blocking)

- Breaks Lambda packaging / CFN Handler resolution / deployability
- Security issues (secrets in source/zips/logs, auth bypass, unsafe CORS/WAF weakening)
- Crash bugs / unhandled errors on critical handler paths
- Coverage threshold regressions or deleted tests without replacement
- Architecture violations (Express/HTTP server, wrong layering, collapsing packages without approval)
- Type-safety abuse (`any` sprawl without justification)
- Broken API/data contracts (`api.yaml`, gateway models, Dynamo shapes) without documentation
- Weakening `strict` or Node 24 alignment without approval

### SHOULD (significant)

- Missing tests for behavior changes
- Undeclared runtime dependencies (`uuid`, `aws-sdk`, etc.)
- Performance footguns (unbounded Dynamo scans, huge zip growth, careless SDK init)
- Duplicated shared util patterns instead of `src/common/`
- Poor error responses or inconsistent error classes
- Docs/CI drift (stale workflow names, OpenAPI vs CFN auth wording)

### NICE TO HAVE (non-blocking)

- Naming polish
- Optional refactors of equivalent approaches
- Extra docs polish

### VERIFY (needs human/runtime confirmation)

- Live authorizer behavior vs OpenAPI wording
- CFN stack deploy order in a given account
- Residual SDK v2 after upgrades
- Jest `coverageThreshold` (80% statements) as the sole coverage gate
- Zip layout vs `Handler: index.handler` (zip-root `index.js`)

### OUT OF SCOPE

Noted for awareness but not actionable in this PR/review pass.

---

## PR hygiene

- Focused change; Conventional Commits
- Preflight contemplated / CI green
- No unrelated drive-bys
- One review bullet = one task; format `` `path:line` — imperative ``

Do not paste domain checklists wholesale into review output.
