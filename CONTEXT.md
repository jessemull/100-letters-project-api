# CONTEXT.md — 100 Letters Project API

> **This is the PRIMARY entry point for ALL AI agents working in this repository.**
> Read this file first. Follow the mandatory reading order below before making any changes.

---

## Mandatory Reading Order

Every agent MUST read the following documents **in order** before making any change:

1. **`CONTEXT.md`** (this file) — loading order, source-of-truth precedence, non-negotiable constraints, quality gates
2. **`AGENTS.md`** — complete development rules, architecture constraints, coding standards, and forbidden patterns
3. **`docs/GOVERNANCE.md`** — contribution workflow, PR process, review policy
4. **`docs/ARCHITECTURE.md`** — Lambda-per-route layout, packaging, CFN, siblings
5. **`docs/TESTING.md`** — Jest strategy, coverage gates
6. **`docs/COMMENTS.md`** — comment policy
7. **`docs/SECURITY.md`** — authorizer, secrets, CORS, WAF
8. **`docs/DEPENDENCIES.md`** — multi-package upgrades and holds
9. **`docs/RELEASES.md`** — per-Lambda S3 versioning and rollback
10. **`docs/CI_CD.md`** — real workflow filenames and deploy gates

Read items 5–10 on every task. Do not skip them because the work “seems unrelated.”

Domain docs to load when the task touches that area: `docs/API_CONTRACT.md`, `docs/INFRA.md`, `docs/ERROR_HANDLING.md`, `docs/NETWORKING.md`, `docs/PERFORMANCE.md`.

For PR or repo reviews, also read **`docs/REVIEW.md`**.

---

## Source-of-Truth Precedence

When instructions conflict, the **higher-ranked source wins**:

| Priority    | Source                                         | Scope                                         |
| ----------- | ---------------------------------------------- | --------------------------------------------- |
| 1 (highest) | `CONTEXT.md`                                   | Repository-wide constraints and quality gates |
| 2           | `docs/GOVERNANCE.md`                           | Contribution workflow and review policy       |
| 3           | `docs/ARCHITECTURE.md`                         | System design and module boundaries           |
| 4           | Domain docs (`API_CONTRACT.md`, `INFRA.md`, …) | Domain-specific rules                         |
| 5 (lowest)  | Inline code comments                           | Local implementation notes                    |

**Lower-precedence instructions MUST NOT contradict higher-precedence instructions.** If a conflict is detected, flag it for human review and follow the higher-precedence source.

**Deployed auth and API Gateway wiring:** CloudFormation under `cloudformation/` wins over OpenAPI annotations in `api.yaml` when they disagree. Document drift; do not “fix” live auth by editing OpenAPI alone.

---

## Non-Negotiable Constraints

These constraints apply to **every change**. No exceptions without explicit human approval.

### Platform & packaging

- **AWS Lambda `nodejs20.x`** — keep CI Node and all route `template.yaml` runtimes aligned. Do not bump runtime across templates/workflows without explicit approval.
- **Not Express/Fastify** — each route is a Lambda handler packaged with webpack. Do not invent an HTTP server framework.
- Webpack zip layout is load-bearing — CFN `Handler` is `index.handler` (zip root `index.js`) and packaging scripts must keep working. Do not “simplify” packaging without verifying a package still deploys.
- **Multi-package lockfiles** — each `src/routes/<name>/` has its own `package.json` / lockfile. Do not skip route lockfiles after dependency changes. Update `templates/` when scaffolding deps change.

### Type safety & quality

- **TypeScript `strict: true`** — do not weaken compiler options.
- **No blanket `any`** — prefer precise types for API Gateway events and DynamoDB items.
- **≥ 80% Jest statement coverage** — do not lower the threshold; do not delete tests to greenwash coverage.
- **Conventional Commits** — enforced by commitlint + Husky.

### Secrets & boundaries

- **No hardcoded secrets** — env vars / Secrets Manager / CI secrets only.
- **No secrets in Lambda zips or logs** — never embed credentials, private keys, or full auth tokens in bundles or `logger` output.
- **Authorizer boundary** — custom TOKEN authorizer lives in sibling `100-letters-project-authorizer`. Cognito User Pool issues tokens; do not collapse siblings into this repo without a product decision.

### Contract

- **`api.yaml` is the OpenAPI contract** (filename is `api.yaml`, not `API.yaml`). Keep handlers, API Gateway models, and docs consistent. Prefer documenting CFN auth reality accurately when OpenAPI lags.

---

## Quality Gates

Before considering work complete, agents MUST ensure:

| Gate                    | Command                                                      |
| ----------------------- | ------------------------------------------------------------ |
| Lint                    | `make lint` or `npm run lint:all`                            |
| Typecheck               | `make typecheck` or `npm run typecheck`                      |
| Format (optional local) | `make format` or `npm run format`                            |
| Unit tests + coverage   | `make test` or `npm run test:all`                            |
| Packaging smoke         | `make build` (representative route) or `npm run build-pkg -- <name>` |
| Full preflight          | `make preflight` or `npm run preflight`                      |
| Security advisory       | `make security` or `npm audit` (never `npm audit fix --force`) |

---

## Repository Identity

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Project**       | 100 Letters Project API                                                                        |
| **Stack**         | TypeScript AWS Lambda + API Gateway (multi-package mono-repo)                                  |
| **Runtime**       | Node.js 20 / `nodejs20.x`                                                                      |
| **Contract**      | `api.yaml` (OpenAPI 3)                                                                         |
| **Data**          | DynamoDB (letters, recipients, correspondences), S3 images, SES contact email                  |
| **Auth**          | Custom TOKEN authorizer (sibling repo) + Cognito tokens; CFN `AuthorizationType: CUSTOM`       |
| **Infra**         | `cloudformation/*.yaml`; deploy via GitHub Actions + CFN change sets + S3 zip artifacts        |
| **Sibling repos** | Client (`100-letters-project`), Lambda@Edge, authorizer (`100-letters-project-authorizer`)     |

---

## Cursor / agent tooling

- Rules: `.cursor/rules/`
- Skills: `.cursor/skills/`
- Human ops detail remains in `README.md`; agent rules live in this governance chain.
