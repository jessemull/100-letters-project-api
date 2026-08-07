# Repo review — 100 Letters Project API

Date: 2026-08-07  
Scope: Full repository after governance port, dependency upgrades, and review follow-ups  
Severity: `docs/REVIEW.md`

## Scope

Governance docs, Cursor tooling, multi-package dependency upgrades, AWS SDK v3 S3/SES migration, `crypto.randomUUID` replacing undeclared `uuid`, stdout-only bunyan (no `bunyan-cloudwatch`), OpenAPI/CI/docs alignment, preflight/Makefile.

## Architecture

Lambda-per-route TypeScript mono-repo; shared `src/common/`; CFN split; sibling TOKEN authorizer. Matches `docs/ARCHITECTURE.md`.

## Areas reviewed

- Correctness / packaging
- API contract / auth
- Security / secrets
- Multi-package maintainability
- CI drift
- Coverage

## MUST

- `(resolved)` `src/routes/*/template.yaml` + `templates/template.yaml.template` — Handler set to `index.handler` to match zip root `index.js`.

## SHOULD

- `(resolved)` Logger — removed `bunyan-cloudwatch` / transitive `aws-sdk` v2 from webpack bundles; bunyan logs to stdout (Lambda → CloudWatch).
- `(resolved)` `api.yaml` — global `security: [CognitoAuthorizer]`; public `/contact` uses `security: []`; scheme documents custom TOKEN authorizer.
- `(resolved)` CI — Jest `coverageThreshold` is the coverage gate; HTML scrape retired; `npm run typecheck` added to PR and merge lint jobs.
- `(resolved)` `scripts/seed-db.js` — uses `crypto.randomUUID` (no undeclared `uuid`).
- `(resolved)` `deleteCorrespondence` — `TransactWriteItem` typed via `TransactWriteCommandInput` (no `any`).

## NICE TO HAVE

- `(resolved)` Per-route `LambdaInvokePermission{Route}` logical IDs (scaffold uses `LambdaInvokePermission`).
- `(resolved)` Category example `TECHNOLOGY` in OpenAPI.
- `(resolved)` Dropped unused SAM `Transform` from `imageProcessor` template.
- `(resolved)` Documented that `scripts/post-build.js` is optional / not on the default package path.
- `(resolved)` Removed unused `dotenv` `DefinePlugin` from route webpack configs.
- Test teardown — Fix Jest “worker failed to exit gracefully” (likely open handles from AWS clients) — still optional.

## OUT OF SCOPE

- Sibling authorizer/client/edge code changes
- Live AWS deploys / stack ordering in accounts
- Replacing bunyan with another logger family

## VERIFY

- Live authorizer vs OpenAPI wording in deployed stages
- CFN stack deploy order for greenfield accounts
- Confirm redeploy picks up `index.handler` and smaller zips without `aws-sdk` v2 JSON
- Confirm CFN rename of invoke permission logical IDs is a no-op or accepted replacement on next stack update

## Coverage

- Jest `coverageThreshold.global.statements: 80` is the sole coverage gate.
- Coverage HTML uploaded as a CI artifact only (not scraped).

## Strengths

- Governance spine (`CONTEXT.md` → docs → Cursor) is API-shaped and accurate
- `make preflight` green (lint, typecheck, test, representative build)
- S3/SES on AWS SDK v3; undeclared `uuid` removed; logging path free of `aws-sdk` v2
- Route lockfiles + `templates/` synced via `install:all`

## Verdict

**Ship** — prior MUST/SHOULD/NICE review items addressed; remaining NICE is optional Jest open-handle teardown.
