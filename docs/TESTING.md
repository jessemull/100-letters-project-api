# TESTING.md

> Jest strategy for the multi-package Lambda API.

---

## Goals

- Confidence in handlers and shared utilities
- Catch regressions before deploy
- Prefer behavior and error paths over implementation trivia

---

## Stack

| Layer | Tool | Notes |
| ----- | ---- | ----- |
| Unit / handler | Jest 29+ + ts-jest | Root `npm run test:all` collects coverage from `src/**/*` |
| Per-route | `npm run test:pkg -- <name>` | Route-local jest config where present |
| Coverage gate | **80% statements** | CI scrapes `coverage/lcov-report/index.html`; Jest `coverageThreshold` should match |

Root `jest.config.js` excludes `src/types/**` and `src/common/config/**` from coverage collection.

---

## What to test

- Handler success and failure paths (bad input, not found, downstream errors)
- Shared errors’ `build()` status codes and bodies
- Shared utils (headers/CORS allowlist, Dynamo helpers when logic is non-trivial)
- Image/contact edge cases when changing those routes

## What not to overtest

- AWS SDK internals
- Pure CloudFormation YAML (review in PR instead)
- Webpack config boilerplate unless changing packaging behavior

---

## Conventions

- Colocate `*.test.ts` next to sources (common and routes)
- Do not delete tests only to pass the coverage gate
- Do not lower the 80% statement threshold without governance review

---

## Commands

| Command | Description |
| ------- | ----------- |
| `make test` / `npm run test:all` | Full Jest + coverage |
| `npm run test:all:watch` | Watch mode |
| `npm run test:pkg -- <name>` | Single route |
| `npm run coverage:open` | Open HTML report (macOS) |
| `make preflight` | lint + typecheck + test + representative build |

See also `.cursor/skills/testing/SKILL.md`.
