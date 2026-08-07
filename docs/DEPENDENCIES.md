# DEPENDENCIES.md

> Multi-package dependency policy for root, every `src/routes/*/package.json`, and `templates/`.

---

## Principles

- Prefer packages already in the tree.
- New runtime dependencies need a PR problem statement and human review when they touch auth, networking, crypto, or large native binaries.
- **Stay on the latest versions that peer ranges allow.** Do not invent holds from CloudFormation/CI alone — update templates and workflows when bumping runtimes.
- **Never** `npm audit fix --force`.
- After upgrades: update **root + all route lockfiles + `templates/`** so new routes do not scaffold stale deps.
- Use `npm run install:all` / existing scripts — there are **no npm workspaces**.
- Also keep **GitHub Actions** (`actions/*`, `aws-actions/*`, etc.) on current majors.

---

## Upgrade process

1. Audit root, `src/routes/*/package.json`, `templates/package.json.template`, `.github/workflows/`, and Lambda `Runtime` in all `template.yaml` files vs latest.
2. Upgrade in groups (Node/runtime + Actions → tooling → eslint/typescript → jest → AWS SDK → webpack → logging).
3. After each risky group: `npm run install:all`, `npm run test:all`, packaging smoke (`build-pkg` / `package:pkg` on at least one route).
4. Fix undeclared runtime imports as part of making upgrades safe.
5. Record **only true peer/interop holds** in the table below.
6. Application AWS clients use SDK v3 (`@aws-sdk/*`). Do not reintroduce `aws-sdk` v2 imports.

---

## AWS SDK policy

| Area | Policy |
| ---- | ------ |
| DynamoDB | `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3) — keep majors aligned across root/routes |
| S3 | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (v3) via `src/common/util/s3.ts` |
| SES | `@aws-sdk/client-ses` (v3) via `src/common/util/ses.ts` |
| Cognito token script | `@aws-sdk/client-cognito-identity-provider` (devDependency) |
| `aws-sdk` v2 | Do **not** import in application code; removed from the logging path (stdout-only bunyan) |

---

## Intentional version holds

Only list packages that **cannot** move to latest because of peer/tooling constraints (not convenience).

| Package / area | Held at | Latest blocked | Why |
| -------------- | ------- | -------------- | --- |
| TypeScript | **6.0.x** (^6.0.3) | 7.x | `@typescript-eslint/*` peers: `typescript: >=4.8.4 <6.1.0`; `ts-jest` peers: `typescript: >=4.3 <7`. Root tsconfig sets `ignoreDeprecations: "6.0"` for route `baseUrl` until paths are migrated. |
| `bunyan` | **1.8.15** | n/a (already latest) | Structured stdout logging; Lambda captures to CloudWatch |

### Not holds (current targets)

| Area | Current |
| ---- | ------- |
| Lambda runtime | `nodejs24.x` (all route `template.yaml` + scaffold) |
| CI Node | `24` (`setup-node`) |
| `engines.node` | `>=22 <25` (local/CI may use 22+; Lambda runtime **nodejs24.x**) |
| ESLint | **10.x** |
| Jest / ts-jest | **30** / **29.4** |
| `@aws-sdk/*` | **^3.1105.0** |
| webpack / webpack-cli | **5.109** / **7.x** |
| GitHub Actions | `checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `configure-aws-credentials@v6`, `changed-files@v47` |

Re-validate peers on each upgrade cycle. Prefer updating CFN/workflows/docs when a newer runtime exists over freezing an old runtime “because templates say so.”

---

## Discouraged without approval

- Express / Fastify / Koa / Nest
- Collapsing multi-package routes into workspaces/monorepo tooling without a product decision
- Extra LLM SDKs in Lambda bundles
- Force-resolving audits or disabling lockfiles

---

## Automation

- Prefer Dependabot / manual grouped PRs with `make preflight` green.
- Breaking majors: one concern per PR when feasible; always sync route lockfiles and Action pins.
