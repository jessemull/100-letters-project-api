---
name: commit
description: >-
  Prepare Conventional Commits for the 100 Letters Project API.
  Use when staging or committing.
---

# Commit

- Read CONTEXT, AGENTS, GOVERNANCE, TESTING before committing
- Only when the user asks; never `--no-verify` unless asked; never force-push main
- Steps: status/diff/log → stage (no secrets) → HEREDOC commit + hooks → status after
- Prefer Commitizen (`npm run commit`) when interactive
- Small Conventional Commits preferred for governance/deps work
