# INFRA.md

> CloudFormation ownership, stack roles, and Secrets Manager parameters.

---

## Shared stacks (`cloudformation/`)

| Stack file | Owns |
| ---------- | ---- |
| `one-hundred-letters-api-gateway-stack.yaml` | RestApi, custom domain, WAF ACL + association |
| `one-hundred-letters-api-gateway-methods-stack.yaml` | Methods, CORS OPTIONS, CUSTOM vs NONE auth |
| `one-hundred-letters-api-*-models-stack.yaml` | API Gateway models (letter, recipient, correspondence, uploads, SES, errors) |
| `one-hundred-letters-dynamo-stack.yaml` | DynamoDB tables |
| `one-hundred-letters-cognito-pool-stack.yaml` | User pool + app client |
| `one-hundred-letters-ses-stack.yaml` | SES identity / DKIM |
| `one-hundred-letters-lambda-execution-role-stack.yaml` | Lambda execution role (exported for route templates) |
| `one-hundred-letters-lambda-s3-stack.yaml` | Artifact bucket for Lambda zips |
| `one-hundred-letters-github-role-stack.yaml` | GitHub Actions deploy role |
| `one-hundred-letters-cloudwatch-role-stack.yaml` | API Gateway CloudWatch account role |
| `one-hundred-letters-bastion-stack.yaml` | Bastion EC2 for SSH tunnel |

---

## Per-route stacks

Each `src/routes/<name>/template.yaml` defines:

- `AWS::Lambda::Function` (`<name>-${Environment}`)
- Runtime `nodejs24.x`, Handler `index.handler`
- Code from imported artifact bucket + `S3Key` parameter
- Env vars via `{{resolve:secretsmanager:…}}`
- API Gateway invoke permission

Workflow stack name pattern: `one-hundred-letters-route-<name>-stack-<env>`.

---

## Secrets Manager

Route templates resolve secrets such as:

- Table names (`one-hundred-letters-tables-<env>`)
- CORS allow origin (`one-hundred-letters-api-<env>`)
- Image bucket (`one-hundred-letters-images-<env>`)
- SES / reCAPTCHA-related keys as used by contact/upload routes

Do not hardcode secret values in YAML or TypeScript. Parameterize environments (`dev` / `prod`).

---

## Exports / imports

Route templates **import** Lambda role ARN and artifact bucket name from shared stacks. Changing export names is a breaking infra change — coordinate deploys carefully.

---

## Deploy order (high level)

1. Foundational IAM / artifact bucket / CloudWatch role
2. DynamoDB, Cognito, SES, bastion as needed
3. API Gateway + models + methods (authorizer ARN must exist from sibling stack)
4. Route Lambda stacks
5. API Gateway stage deployment when methods/integrations change

Exact ordering for greenfield accounts may require operator runbooks beyond this file — flag VERIFY items in reviews when unsure.
