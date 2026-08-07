# DEPENDENCIES.md

> Multi-package dependency policy for root, every `src/routes/*/package.json`, and `templates/`.

---

## Principles

- Prefer packages already in the tree.
- New runtime dependencies need a PR problem statement and human review when they touch auth, networking, crypto, or large native binaries.
- Stay current within **supported** majors; document intentional holds.
- **Never** `npm audit fix --force`.
- After upgrades: update **root + all route lockfiles + `templates/`** so new routes do not scaffold stale deps.
- Use `npm run install:all` / existing scripts — there are **no npm workspaces**.

---

## Upgrade process

1. Audit root, `src/routes/*/package.json`, and `templates/package.json.template` vs latest.
2. Upgrade in groups (tooling → eslint/typescript → jest → AWS SDK → webpack → logging).
3. After each risky group: `npm run install:all`, `npm run test:all`, packaging smoke (`build-pkg` / `package:pkg` on at least one route).
4. Fix undeclared runtime imports (`uuid`, `aws-sdk`, etc.) as part of making upgrades safe.
5. Record holds in the table below.
6. Prefer migrating S3/SES to AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/client-ses`, presigner). If deferred, **declare** `aws-sdk` v2 explicitly — do not rely on `bunyan-cloudwatch`’s transitive copy.

---

## AWS SDK policy

| Area | Policy |
| ---- | ------ |
| DynamoDB | `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3) — keep majors aligned across root/routes |
| S3 | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (v3) via `src/common/util/s3.ts` |
| SES | `@aws-sdk/client-ses` (v3) via `src/common/util/ses.ts` |
| Cognito token script | `@aws-sdk/client-cognito-identity-provider` (devDependency) |
| `aws-sdk` v2 | Do **not** import in application code; may remain transitive via `bunyan-cloudwatch` only |

---

## Intentional version holds

| Package / area | Held at | Latest blocked | Why |
| -------------- | ------- | -------------- | --- |
| Lambda Node / CI | **20** / `nodejs20.x` | 22+ | Runtime bump requires all `template.yaml` + workflows + human approval |
| ESLint | **9.x** (currently ^9.39.5) | 10.x | Stay on 9 until ecosystem peers allow 10 |
| TypeScript | **5.x** (currently ^5.9.3) | 6+/7 | typescript-eslint peers (`typescript: >=4.3 <7`) |
| `lint-staged` | **15.x** | 17.x | Avoid unrelated major churn with Husky/commitlint until validated |
| `bunyan` / `bunyan-cloudwatch` | **1.8.15** / **2.2.0** | n/a (latest) | Still current; CloudWatch logging must keep working |
| `aws-sdk` v2 | **removed from app code** | — | S3/SES migrated to `@aws-sdk/client-s3` / `client-ses` + presigner; v2 may remain transitive via `bunyan-cloudwatch` only — webpack still packs large `aws-sdk` API JSON into route zips (SHOULD: externalize or replace logger) |

### Resolved in latest upgrade

- Undeclared `uuid` usage replaced with Node `crypto.randomUUID` (Node 20).
- S3/SES no longer rely on undeclared transitive `aws-sdk` v2 for application code.
- `@aws-sdk/*` aligned to ^3.1105.0 across root and routes.
- Jest **30** + ts-jest **29.4** (peers allow Jest 29/30); coverageThreshold statements **80** remains.

Re-validate peers on each upgrade cycle; do not cargo-cult holds from other repos.

---

## Discouraged without approval

- Express / Fastify / Koa / Nest
- Collapsing multi-package routes into workspaces/monorepo tooling without a product decision
- Extra LLM SDKs in Lambda bundles
- Force-resolving audits or disabling lockfiles

---

## Automation

- Prefer Dependabot / manual grouped PRs with `make preflight` green.
- Breaking majors: one concern per PR when feasible; always sync route lockfiles.
