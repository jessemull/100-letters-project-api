# SECURITY.md

> Auth, secrets, CORS, WAF, bastion, and artifact safety for the API.

---

## Authorizer and Cognito

- **Deployed API Gateway** uses a **custom TOKEN** authorizer (sibling `100-letters-project-authorizer`). Identity source: `Authorization` header. TTL may be `0` (see gateway stack).
- Protected methods: `AuthorizationType: CUSTOM`.
- **Cognito User Pool** (this repo’s `one-hundred-letters-cognito-pool-stack.yaml`) issues tokens; the authorizer validates them.
- OpenAPI may still say Cognito user-pool authorizer — treat **CFN as runtime source of truth**.

Do not log bearer tokens or full JWT payloads.

---

## Secrets

- Lambda env vars resolve from **AWS Secrets Manager** in route `template.yaml` files.
- Local scripts (token, seed, bastion) use env / `.env*` (gitignored).
- Never commit AWS keys, Cognito client secrets, reCAPTCHA secrets, or private keys.
- Never embed secrets in webpack bundles or S3 deployment zips beyond what the runtime must read from the environment.

---

## CORS and public endpoints

- API Gateway OPTIONS methods set CORS headers (methods stack).
- Runtime `getHeaders` uses an allowlist from `ACCESS_CONTROL_ALLOW_ORIGIN` (Secrets Manager).
- **Contact** `POST` is public (`AuthorizationType: NONE`) and protected with reCAPTCHA + WAF rate limiting on `/contact`.

---

## WAF

- Regional Web ACL associated with the API stage.
- Rate limit (1000/IP) scoped to URI paths containing `/contact` (see gateway stack). Do not weaken without review.

---

## Bastion

- `npm run bastion` / `one-hundred-letters-bastion-stack.yaml` — SSH tunnel helper for private resources.
- Treat bastion access as privileged; do not expose keys in docs or logs.

---

## Dependencies

- Run `make security` / `npm audit` on upgrades.
- Never `npm audit fix --force`.
- Declare runtime AWS SDK dependencies explicitly (see `DEPENDENCIES.md`).

---

## Observability

- Bunyan + CloudWatch via `bunyan-cloudwatch`.
- Log enough to debug; do not log secrets, Authorization headers, or unnecessary PII (letter body contents, email bodies beyond what ops already require).
