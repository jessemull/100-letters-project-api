# PERFORMANCE.md

> Lambda-focused performance notes (not a frontend perf guide).

---

## Zip size

- Webpack bundles each route; avoid pulling large unused deps into every package.
- Prefer shared thin wrappers in `src/common/util/` over duplicating heavy clients.
- After dependency upgrades, smoke-build at least one route and note large zip growth in the PR.

---

## Memory and timeout

- Route templates commonly use **128 MB** and **10s** timeout (confirm per `template.yaml`).
- Image processing may need more — change deliberately and measure.

---

## Cold start

- Keep Node 20; avoid huge sync work at module load when possible.
- Reuse SDK clients at module scope (existing pattern in `src/common/util/`).
- Be careful with native addons and dynamic imports that inflate init time.

---

## Data access

- Avoid unbounded DynamoDB scans on hot paths; prefer keyed queries.
- Cap fan-out when composing letters/recipients/correspondences.
