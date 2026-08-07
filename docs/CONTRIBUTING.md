# CONTRIBUTING.md

> How to contribute to the 100 Letters Project API.

---

## Setup

```bash
npm install
npm run install:all
cp .env.example .env   # if present; otherwise configure env for token/seed scripts
make preflight
```

See `README.md` for Cognito token, bastion, and seed/reset details.

---

## Branching and commits

- Branch from `main` (or the repo’s current default integration branch)
- Conventional Commits (commitlint); prefer `npm run commit` (Commitizen)
- Husky: lint-staged on pre-commit; commitlint on commit-msg

---

## Pull requests

- Describe what / why / how tested
- Ensure `make preflight` is green locally when feasible
- Link issues when applicable
- Reviews use `docs/REVIEW.md` severity tiers
- Governance changes: title prefix `[governance]`

---

## Code style

- ESLint 10 + Prettier
- TypeScript `strict: true`
- Shared logic in `src/common/`; one Lambda per `src/routes/<name>/`
- Tests for behavior changes; keep ≥80% statement coverage
- Prefer latest supported deps/Actions/Lambda runtimes (`docs/DEPENDENCIES.md`)

---

## Where to read next

1. `CONTEXT.md`
2. `AGENTS.md`
3. `docs/GOVERNANCE.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`
