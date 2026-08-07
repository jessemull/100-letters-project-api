# COMMENTS.md

> Comment policy for TypeScript in this repository.

---

## Philosophy

Comments are a cost. Prefer clear names, types, structure, and tests. Comments explain **why** — intent, constraints, trade-offs — not what the next line obviously does.

---

## Decision tree

1. Can you rename, extract, or type the code so the comment is unnecessary? Do that.
2. If intent/constraint is invisible to readers, add a short comment.
3. Delete comments that restate the code or contradict it.

---

## Spacing (TypeScript / JavaScript)

- Standalone `//` comments: blank line above and below (except at block start/end — then only the inner blank).
- JSDoc: flush above the declaration it documents.
- No long-term commented-out code; no TODOs without context/owner.

---

## Forbidden

- Comments that contradict code
- Huge banners that duplicate `docs/`
- Logging “explanations” that include secrets
