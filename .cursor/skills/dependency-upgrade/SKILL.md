---
name: dependency-upgrade
description: Upgrade or add npm dependencies safely across root and route packages.
---

# Dependency upgrade

1. Read `docs/DEPENDENCIES.md`.
2. Audit root + all `src/routes/*/package.json` + `templates/`.
3. Upgrade in groups; after each risky group run `npm run install:all` + `npm run test:all` + packaging smoke.
4. Fix undeclared runtime deps (`uuid`, `aws-sdk`, …).
5. Sync all route lockfiles and scaffold templates.
6. Document holds; never `npm audit fix --force`.
7. Prefer AWS SDK v3 for S3/SES; if deferred, declare v2 explicitly.
