# GOVERNANCE.md

> Precedence: see `CONTEXT.md`. This document defines contribution workflow, decision authority, and review policy.

---

## Source-of-truth precedence

| Priority    | Source                |
| ----------- | --------------------- |
| 1 (highest) | `CONTEXT.md`          |
| 2           | `docs/GOVERNANCE.md`  |
| 3           | `docs/ARCHITECTURE.md`|
| 4           | Domain docs           |
| 5 (lowest)  | Inline comments       |

When OpenAPI (`api.yaml`) and CloudFormation disagree on **deployed** auth or method security, **CloudFormation wins** for runtime behavior. Document and fix drift deliberately.

---

## Non-negotiable constraints

Summarized from `CONTEXT.md`: Lambda Node 24, strict TypeScript, ≥80% statement coverage, Conventional Commits, no secrets in source/zips/logs, no Express, preserve multi-package packaging, no `npm audit fix --force`.

---

## Decision authority

### Autonomous (agents/contributors may proceed)

- Bugfixes that do not change the public API contract, auth model, or deploy topology
- Tests and docs inside existing files
- Lint/format fixes
- Internal refactors that preserve handler contracts and shared APIs

### Human review required

- Changes to governance docs (`CONTEXT.md`, `AGENTS.md`, `docs/*`, `.cursor/**`)
- New third-party runtime dependencies (especially auth, networking, crypto)
- CI/CD workflow or CloudFormation changes
- Security-sensitive code (authorizer integration, CORS, secrets wiring)
- API contract changes (`api.yaml`, API Gateway models)
- Removing tests or changing coverage thresholds
- Lambda runtime bumps or packaging/Handler path changes

### Product decision required

- Collapsing per-route packages into one
- Adding an HTTP framework (Express/Fastify/etc.)
- Embedding authorizer/client/edge logic into this repo
- New vendors or privacy-affecting logging/analytics

---

## Governance doc change process

- PR title prefix `[governance]` when changing governance
- Explain why / prior behavior / impact
- At least one human reviewer; two if changing `GOVERNANCE.md` itself
- Cascade updates to lower-precedence docs and Cursor rules/skills when needed

---

## Review policy

- Severity tiers: `docs/REVIEW.md` (MUST / SHOULD / NICE TO HAVE; skills may also use VERIFY / OUT OF SCOPE)
- MUST blocks merge
- Agents producing reviews must follow skill output shapes (`.cursor/skills/pr-review`, `repo-review`)
