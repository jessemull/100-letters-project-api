# Repo review — 100 Letters Project API

Date: 2026-08-07  
Scope: Full repository after governance port, dependency upgrades, and review follow-ups  
Severity: `docs/REVIEW.md`

## Scope

Governance docs, Cursor tooling, multi-package dependency upgrades, AWS SDK v3 S3/SES migration, stdout-only bunyan, OpenAPI/CI/docs alignment, PII log cleanup, webpack require cleanup.

## Architecture

Lambda-per-route TypeScript mono-repo; shared `src/common/`; CFN split; sibling TOKEN authorizer. Matches `docs/ARCHITECTURE.md`.

## Areas reviewed

- Correctness / packaging
- API contract / auth
- Security / secrets
- Multi-package maintainability
- CI drift
- Coverage / docs drift

## MUST

- `(resolved)` Handler `index.handler` + `nodejs24.x` on all route templates.

## SHOULD

- `(resolved)` Logger stdout-only; no `bunyan-cloudwatch` / aws-sdk v2 zip bloat.
- `(resolved)` OpenAPI global security + public `/contact`; docs match custom TOKEN scheme.
- `(resolved)` CI typecheck + Jest `coverageThreshold` only (no HTML scrape); TESTING/AGENTS wording aligned.
- `(resolved)` `scripts/seed-db.js` uses `crypto.randomUUID`.
- `(resolved)` `deleteCorrespondence` typed without `any`.
- `(resolved)` Removed success-path `logger.error(letterData)` in `createLetter` (PII).

## NICE TO HAVE

- `(resolved)` Per-route invoke permission names; Category example; imageProcessor Transform; post-build docs; webpack `dotenv` DefinePlugin; unused `webpack` requires.
- `(resolved)` Util tests import leaf modules and destroy Dynamo client to reduce open-handle risk.

## OUT OF SCOPE

- Sibling authorizer/client/edge code changes
- Live AWS deploys / stack ordering in accounts
- Replacing bunyan with another logger family

## VERIFY

- Live authorizer vs OpenAPI wording in deployed stages
- CFN stack deploy order for greenfield accounts
- Confirm redeploy picks up `index.handler` and slim zips without `aws-sdk` v2
- Confirm CFN rename of invoke permission logical IDs on next stack update

## Coverage

- Jest `coverageThreshold.global.statements: 80` is the sole coverage gate.
- Coverage HTML uploaded as a CI artifact only.

## Strengths

- Governance spine matches Lambda-per-route reality
- Packaging contract consistent end-to-end
- Auth OpenAPI/CFN story coherent
- Multi-package lockfiles + templates synced

## Verdict

**Ship** — prior MUST/SHOULD/NICE review items addressed.
