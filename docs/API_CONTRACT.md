# API_CONTRACT.md

> How OpenAPI, API Gateway models, DynamoDB shapes, and handler validation relate.

---

## OpenAPI (`api.yaml`)

- Filename: **`api.yaml`** (README historically said `API.yaml` in places — use `api.yaml`).
- OpenAPI **3.0.1**; title `OneHundredLettersApi`.
- Servers: `https://api.onehundredletters.com` (prod), `https://api-dev.onehundredletters.com` (dev).

Treat `api.yaml` as the human- and client-facing contract for paths, methods, and schemas. Keep handler request/response shapes aligned when changing behavior.

---

## API Gateway models

JSON Schema models for request/response/error bodies live in CloudFormation:

- `cloudformation/one-hundred-letters-api-letter-models-stack.yaml`
- `cloudformation/one-hundred-letters-api-recipient-models-stack.yaml`
- `cloudformation/one-hundred-letters-api-correspondence-models-stack.yaml`
- `cloudformation/one-hundred-letters-api-uploads-models-stack.yaml`
- `cloudformation/one-hundred-letters-api-ses-models-stack.yaml`
- `cloudformation/one-hundred-letters-api-error-models-stack.yaml`

Methods bind these models in `one-hundred-letters-api-gateway-methods-stack.yaml`.

When changing a payload:

1. Update `api.yaml`
2. Update the relevant model stack
3. Update handler validation and tests
4. Redeploy API Gateway stage when needed (`deploy-api-gateway.yml`)

---

## Auth annotations vs CFN

**Deployed reality:** custom TOKEN authorizer + `AuthorizationType: CUSTOM` on protected methods. OpenAPI applies global `security: [CognitoAuthorizer]` and sets `security: []` on public `/contact`. Scheme name is historical (`CognitoAuthorizer`); `x-amazon-apigateway-authtype` is `custom`. Prefer CFN methods stack if annotations and CFN ever diverge.

---

## DynamoDB models

Domain types live under `src/types/` (letters, recipients, correspondences, dynamo helpers). Tables are provisioned in `one-hundred-letters-dynamo-stack.yaml`. Table names arrive via Secrets Manager into Lambda env (see route `template.yaml`).

Handlers should validate inputs before writes; map failures to shared errors (`BadRequestError`, `NotFoundError`, `DatabaseError`, `InternalServerError`).

---

## Validation expectations

- Reject malformed bodies with `400` / `BadRequestError`
- Missing resources → `404` / `NotFoundError`
- Unexpected persistence failures → `DatabaseError` / `InternalServerError` without leaking internals
- Contact endpoint: public + reCAPTCHA (and WAF rate limit on `/contact`) — see `SECURITY.md` / `NETWORKING.md`
