# AGENTS.md — 100 Letters Project API

> Complete development rules and constraints for AI agents and human contributors.
> This file is the authoritative reference for coding standards. Precedence: see `CONTEXT.md`.

---

## Repository Overview

| Field                 | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **Project**           | 100 Letters Project API                                               |
| **Architecture**      | Lambda-per-route TypeScript mono-repo + shared `src/common/`          |
| **Platform**          | AWS Lambda (`nodejs20.x`) + API Gateway                               |
| **Core Technologies** | TypeScript, Jest, ESLint 9, webpack, AWS SDK, bunyan                  |
| **CI/CD**             | GitHub Actions → S3 zip artifacts → CloudFormation change sets        |
| **Git Hooks**         | Husky + lint-staged + Conventional Commits (commitlint)               |

### Layout

```
100-letters-project-api/
├── src/
│   ├── common/              # Shared config, errors, util (dynamo, s3, ses, headers, logger)
│   ├── routes/<name>/       # Per-Lambda package: handler, webpack, jest, template.yaml, lockfile
│   └── types/               # Shared TypeScript types
├── scripts/                 # install/build/package/lint/test orchestration, seed, token, bastion
├── templates/               # Scaffold for `npm run create:route`
├── cloudformation/          # Shared infra stacks (gateway, models, dynamo, cognito, roles, …)
├── docs/                    # Governance documentation
├── .cursor/                 # Rules and skills
├── .github/workflows/       # pull-request, merge, manual, manual-all, rollback, deploy-api-gateway
├── api.yaml                 # OpenAPI 3 contract
├── CONTEXT.md
├── AGENTS.md                # This file
└── Makefile
```

There are **no npm workspaces**. Root scripts orchestrate per-route installs and builds.

---

## Development Commands

Prefer **`make`** targets (see `make help`). Equivalents use npm.

### Setup

| Command                         | Description                                      |
| ------------------------------- | ------------------------------------------------ |
| `npm install`                   | Install root dependencies                        |
| `npm run install:all`           | Install root + every `src/routes/*/package.json` |
| `npm run install:pkg -- <name>` | Install one route package                        |
| `npm run prepare`               | Install Husky hooks                              |

### Quality

| Command            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `make lint`        | `npm run lint:all`                                       |
| `make typecheck`   | `tsc --noEmit` at root                                   |
| `make format`      | Prettier write                                           |
| `make test`        | `npm run test:all` (Jest + coverage)                     |
| `make build`       | Build representative route (`getLetters`) for smoke      |
| `make preflight`   | lint + typecheck + test + representative build           |
| `make security`    | `npm audit` (never `--force`)                            |

### Per-package / packaging

| Command                          | Description                          |
| -------------------------------- | ------------------------------------ |
| `npm run lint:pkg -- <name>`     | Lint one route                       |
| `npm run test:pkg -- <name>`     | Test one route                       |
| `npm run build-pkg -- <name>`    | Webpack build one route              |
| `npm run build-all`              | Build all routes                     |
| `npm run package:pkg -- <name>`  | Zip `dist/` for one route            |
| `npm run package:all`            | Package all routes                   |
| `npm run clean:pkg -- <name>`    | Clean one route                      |
| `npm run clean:all`              | Clean all                            |

### Data / auth / ops

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run db:seed`    | Seed DynamoDB (destructive caution)              |
| `npm run db:reset`   | Reset DynamoDB tables (destructive)              |
| `npm run token`      | Cognito access token helper                      |
| `npm run bastion`    | Bastion SSH helper                               |
| `npm run create:route` | Scaffold a new route from `templates/`         |

---

## Language & Framework Rules

### TypeScript

- Keep `strict: true`.
- Prefer explicit types on exported handlers and shared utilities; avoid `any`.
- Handlers are AWS Lambda + API Gateway event shapes (`@types/aws-lambda`).

### Lambda handlers

- One primary export: `handler` from each route’s `index.ts`.
- Use shared errors from `src/common/errors/` and utils from `src/common/util/`.
- Do not introduce Express/Fastify/Koa or a long-lived HTTP server.

### Comments

Follow `docs/COMMENTS.md`. Prefer self-documenting names; comments explain **why**.

---

## Architecture Rules

### Layers

- **Route handlers** (`src/routes/<name>`) → **shared common** (`src/common`) → **types** (`src/types`).
- Do not copy-paste Dynamo/S3/SES/logger/error helpers into routes — extend `src/common/`.
- New routes: `npm run create:route` and keep scaffold (`templates/`) in sync with dep policy.

### Packaging

- Webpack emits `dist/index.js` (`commonjs2`); `npm run package` zips `dist/`.
- CFN `Handler` is `index.handler` (zip root) — treat packaging and Handler as a verified pair (see `docs/ARCHITECTURE.md` and `lambda-packaging` skill).
- Runtime stays `nodejs20.x` unless human-approved across all templates + CI.

### Auth & siblings

- API Gateway uses a **custom TOKEN** authorizer (ARN imported from sibling authorizer stack).
- Cognito pool (this repo’s CFN) issues tokens consumed by that authorizer.
- Client and Lambda@Edge are out of tree — document integration only; do not edit siblings from this repo.

### Data

- DynamoDB for letters / recipients / correspondences.
- S3 for images; SES for contact email; Secrets Manager for env injection in templates.

---

## Testing Rules

- Root Jest covers `src/**/*` (excluding types/config as configured).
- Coverage gate: **80% statements** (CI scrape + Jest `coverageThreshold` when configured).
- Prefer behavior and error-path tests for handlers and shared utils.
- Do not remove tests solely to raise coverage percentage.

See `docs/TESTING.md`.

---

## Performance Rules

- Watch Lambda zip size, memory settings, and cold start (see `docs/PERFORMANCE.md`).
- Avoid bundling unnecessary native or huge deps into every route zip.
- Prefer shared clients in `src/common/util/` over re-instantiating SDKs carelessly inside hot paths.

---

## Security Rules

- Secrets only in env / Secrets Manager / CI (gitignored `.env*`).
- Never commit AWS keys, Cognito secrets, or reCAPTCHA secrets.
- Do not log Authorization headers, tokens, or full PII payloads.

See `docs/SECURITY.md`.

---

## Git & PR Rules

- Conventional Commits via commitlint; prefer `npm run commit` (Commitizen).
- Pre-commit: lint-staged. Commit-msg: commitlint.
- Review severity tiers: `docs/REVIEW.md` (MUST / SHOULD / NICE / VERIFY).

---

## Forbidden Patterns

- Inventing Express/Fastify or collapsing all routes into one package without asking
- Skipping route lockfiles / `templates/` after dependency upgrades
- Hardcoded secrets or baking secrets into webpack bundles
- Changing Lambda runtime or Handler paths without verifying packaging + CFN
- `npm audit fix --force`
- Lowering coverage below 80% statements or disabling Husky/commitlint to bypass gates
- Editing sibling authorizer/client/edge repos as part of “API” work without an explicit request
- Leaving `aws-sdk` v2 only as an undeclared transitive dependency

---

## When stuck

1. Re-read `CONTEXT.md` precedence.
2. Check domain doc (`API_CONTRACT.md`, `INFRA.md`, `DEPENDENCIES.md`, etc.).
3. Run `make preflight` and fix failures before expanding scope.
4. Flag product/architecture decisions for human review per `docs/GOVERNANCE.md`.
