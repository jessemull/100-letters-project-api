# RELEASES.md

> Per-Lambda release model via S3 versioned zips and CloudFormation.

---

## Model

- Each route Lambda is built, zipped, and uploaded to S3 with a unique artifact name (`<function>-<version>-<commit>-<timestamp>.zip`).
- CloudFormation change sets point the function `Code.S3Key` at that artifact.
- Merge to `main` auto-deploys **changed** Lambdas to **dev**.
- Production (and full fleets) use manual workflow dispatch.

`package.json` versions on routes are informational signals for artifact naming; Conventional Commits drive changelog intent.

---

## Pre-release checklist

- [ ] `make preflight` green
- [ ] API contract unchanged or documented (`api.yaml` + models)
- [ ] No secrets in zips or committed files
- [ ] Runtime still `nodejs24.x` unless approved bump
- [ ] Route lockfiles updated if deps changed
- [ ] For gateway/model/auth changes: plan `deploy-api-gateway.yml`

---

## Hotfix / rollback

1. Identify last known-good S3 artifact for the function/environment.
2. Run `.github/workflows/rollback.yml` with that key.
3. Verify API behavior and CloudWatch logs.
4. Coordinate humans for production incidents.

Prefer Actions + CFN over manual console edits.
