# Repo review — 100 Letters Project API

Date: 2026-08-06  
Scope: Full repository after governance port + dependency upgrades  
Severity: `docs/REVIEW.md`

## Scope

Governance docs, Cursor tooling, multi-package dependency upgrades, AWS SDK v3 S3/SES migration, `crypto.randomUUID` replacing undeclared `uuid`, preflight/Makefile.

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

- `(partial)` `api.yaml` security scheme — updated to `x-amazon-apigateway-authtype: custom` with accurate description; path-level `security:` coverage vs CFN methods still under-documented.
- `src/routes/*/webpack.config.js` — Address ~10MB `aws-sdk` v2 API JSON pulled into bundles via `bunyan-cloudwatch` (zip size / cold start); prefer externals + runtime install, logger swap, or tree-shake strategy.
- `.github/workflows/pull-request.yml` — Prefer Jest `coverageThreshold` as primary gate; keep or retire fragile HTML `Statements` scrape once confirmed under Jest 30.

## NICE TO HAVE

- `(resolved)` Root `package.json` — `"engines": { "node": ">=20 <21" }` added.
- Test teardown — Fix Jest “worker failed to exit gracefully” (likely open handles from AWS/logging clients).

## OUT OF SCOPE

- Sibling authorizer/client/edge code changes
- Live AWS deploys / stack ordering in accounts
- Replacing bunyan with another logger family in this pass

## VERIFY

- Live authorizer vs OpenAPI wording in deployed stages
- CFN stack deploy order for greenfield accounts
- Residual `aws-sdk` v2 only via `bunyan-cloudwatch` (app code clean — confirmed no `from 'aws-sdk'` in `src/`)
- Coverage HTML scrape still parses Jest 30 `lcov-report/index.html`
- Confirm redeploy picks up `index.handler` (do not leave console overrides drifting from templates)

## Coverage

- Jest `coverageThreshold.global.statements: 80` configured; suite currently ~100% statements after upgrades.
- CI still scrapes HTML in parallel — dual gate until scrape retired.

## Strengths

- Governance spine (`CONTEXT.md` → docs → Cursor) is API-shaped and accurate
- `make preflight` green (lint, typecheck, test, representative build)
- S3/SES on AWS SDK v3; undeclared `uuid` removed
- Route lockfiles + `templates/` synced via `install:all`

## Verdict

**Needs work** → remaining SHOULD items (webpack aws-sdk bloat, OpenAPI method security completeness, CI scrape). Handler MUST resolved in Phase 4.
