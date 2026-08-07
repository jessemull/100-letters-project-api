# ERROR_HANDLING.md

> Shared errors and API Gateway error models.

---

## Shared error classes

Located in `src/common/errors/`:

| Class | Status | Use |
| ----- | ------ | --- |
| `BadRequestError` | 400 | Validation / malformed input |
| `NotFoundError` | 404 | Missing letter/recipient/correspondence/etc. |
| `DatabaseError` | 500 | Persistence failures |
| `InternalServerError` | 500 | Unexpected failures |

All implement `CustomError` with `build(headers?)` returning `{ statusCode, body, headers? }` and JSON `{ error, message }`.

Handlers should catch known errors and return `build(getHeaders(event))` (or equivalent) rather than throwing uncaught exceptions on expected paths.

---

## API Gateway error models

`cloudformation/one-hundred-letters-api-error-models-stack.yaml` defines gateway models (e.g. BadRequestError) referenced by methods. Keep handler bodies and models aligned when changing error shapes.

---

## Logging

- Use shared `logger` from `src/common/util/logger.ts`.
- Log error messages and safe context; do not log secrets or full auth headers.
- Prefer structured fields over dumping entire events when they contain PII.

---

## Client-visible messages

- Safe, stable `error` / `message` strings for clients
- Detailed stack traces stay in CloudWatch, not response bodies
