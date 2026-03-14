---
name: review
description: "Request a code review on recent changes."
argument-hint: "[scope: file, branch, or commit range]"
---

Use the `superpowers:requesting-code-review` skill.

**Project standards:**
- Python: async/await, Pydantic v2, type hints
- TypeScript: strict mode, TanStack Query for data fetching
- No unused imports (TS6133 = build failure)
- All DB operations async

**Review scope:** $ARGUMENTS
