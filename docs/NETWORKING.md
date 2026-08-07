# NETWORKING.md

> Domains, CORS, and WAF for the API.

---

## Endpoints

| Purpose | URL |
| ------- | --- |
| Production API | `https://api.onehundredletters.com` |
| Development API | `https://api-dev.onehundredletters.com` |

Custom domains are attached in `one-hundred-letters-api-gateway-stack.yaml` (regional API Gateway domain + base path mapping). Certificate ARN is a stack parameter.

---

## CORS

- OPTIONS mock integrations on methods stack set `Access-Control-Allow-Origin`, Methods, and Headers (includes `Authorization`, reCAPTCHA headers where needed).
- Lambda responses should use `getHeaders(event)` so runtime allowlisting from Secrets Manager applies.

Do not widen CORS to `*` in production Lambda responses without review (gateway OPTIONS may still advertise `*` — treat changes carefully).

---

## WAF

- Regional Web ACL on the API stage.
- Rate limit **1000 requests/IP** scoped to paths containing `/contact`.
- Associated via `AWS::WAFv2::WebACLAssociation`.

---

## Auth header

Clients send `Authorization: <token>` for CUSTOM methods. Authorizer is the sibling TOKEN Lambda — see `SECURITY.md`.

---

## Rules

- Centralize external URLs and secret names; do not scatter prod hostnames in handlers without need.
- Handle non-OK paths per `ERROR_HANDLING.md`.
- Do not call private sibling services from the wrong trust boundary without a product decision.
