# CI_CD.md

> Real GitHub Actions workflows for this repository. Prefer this file over stale README names.

---

## Workflows

| File | Name | Trigger | Purpose |
| ---- | ---- | ------- | ------- |
| `.github/workflows/pull-request.yml` | Lint & Test | PR → `main` | Lint, Jest, coverage artifact, fail if statements &lt; 80% |
| `.github/workflows/merge.yml` | Merge | Push → `main` | Same quality gate; detect changed `src/routes/*` (or shared `src/common/` / `src/types/` → all routes) and dispatch per-Lambda deploy to **dev** |
| `.github/workflows/manual.yml` | Deploy Lambda | `workflow_dispatch` | Build/package one Lambda, upload S3, CFN change set, prune backups |
| `.github/workflows/manual-all.yml` | Deploy All Lambdas | `workflow_dispatch` | Dispatch `manual.yml` for every route |
| `.github/workflows/rollback.yml` | Rollback | `workflow_dispatch` | Redeploy from an existing S3 zip key |
| `.github/workflows/deploy-api-gateway.yml` | Deploy API Gateway | `workflow_dispatch` | `aws apigateway create-deployment` for a stage |

**Stale README names (do not use):** `lint-and-test.yml`, `deploy-lambda.yml`, `deploy-all-lambdas.yml`, `deploy-lambdas-on-merge.yml`, `rollback-lambda.yml`.

---

## Quality jobs

- Node **24**
- `npm ci` / install as defined in the workflow
- ESLint (`lint:all:fix`)
- Typecheck (`tsc --noEmit`)
- Jest with coverage; **80% statements** enforced by Jest `coverageThreshold` (no HTML scrape)
- Coverage report uploaded as a CI artifact

---

## Deploy one / all

- **One:** run `manual.yml` with `lambda_function` + `environment` (`dev` | `prod`).
- **All:** run `manual-all.yml` with `environment`.
- **On merge to main:** `merge.yml` deploys only changed route packages to **dev**.

Artifacts: versioned zips under the Lambda S3 bucket (`100-letters-project-api-<env>`), then CFN change set on `one-hundred-letters-route-<name>-stack-<env>`.

---

## API Gateway deploy

After method/model/authorizer changes, run `deploy-api-gateway.yml` so the stage picks up integrations. Lambda-only code deploys do not replace gateway configuration.

---

## Rollback

Use `rollback.yml` with the Lambda name, environment, and prior S3 artifact key. Prefer Actions rollback over hand-editing live stacks.

---

## Artifact prune

`manual.yml` prunes older backup zips after successful deploy — do not disable pruning casually (cost / clutter).

---

## Local parity

```bash
make preflight   # lint + typecheck + test + representative build
make security
```

Skip hooks only with an explicit human request.
