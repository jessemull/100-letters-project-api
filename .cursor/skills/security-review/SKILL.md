---
name: security-review
description: >-
  Security review for secrets, authorizer boundaries, CORS/WAF, and Lambda artifacts.
---

# Security review

- Read `docs/SECURITY.md` + `docs/REVIEW.md` security items
- Check: hardcoded secrets; PII/token logging; CUSTOM vs public methods; Secrets Manager wiring; zip leakage; dependency risk
- Output MUST/SHOULD/NICE like pr-review
