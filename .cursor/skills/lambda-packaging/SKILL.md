---
name: lambda-packaging
description: >-
  Verify webpack build, zip layout, CFN Handler paths, and Node 20 runtime alignment.
---

# Lambda packaging

1. Confirm route `template.yaml`: `Runtime: nodejs20.x`, `Handler: index.handler`.
2. `npm run build-pkg -- <name>` then `npm run package:pkg -- <name>`.
3. Inspect zip contents — expect `index.js` at zip root matching `index.handler`. Do not change packaging without verifying deployability.
4. Keep CI Node 20 aligned with runtime.
5. See `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`.
