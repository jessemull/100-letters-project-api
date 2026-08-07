---
name: api-contract
description: >-
  Keep api.yaml, API Gateway models, and handler validation aligned.
---

# API contract

1. Read `docs/API_CONTRACT.md` and `api.yaml`.
2. When changing payloads: update OpenAPI + model stacks + handlers + tests.
3. Remember CFN auth wiring may differ from OpenAPI security scheme labels.
4. Redeploy API Gateway stage when methods/models change (`deploy-api-gateway.yml`).
