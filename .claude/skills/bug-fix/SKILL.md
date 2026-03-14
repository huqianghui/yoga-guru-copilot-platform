---
name: bug-fix
description: "Diagnose and fix a bug with systematic debugging (post v1.0 workflow)."
argument-hint: "[bug description or error message]"
---

Handle a bug report with structured workflow.

## Workflow

1. **Document the bug** — create `docs/issues/YYYY-MM-DD-<bug-summary>.md`:
   ```markdown
   # Bug: [summary]
   **Reported**: YYYY-MM-DD
   **Status**: open → investigating → fixed → verified
   **Severity**: critical / high / medium / low

   ## Symptoms
   [What the user sees]

   ## Steps to Reproduce
   [Exact steps]

   ## Root Cause
   [Filled after investigation]

   ## Fix
   [Filled after fix]
   ```

2. **Investigate** — use `superpowers:systematic-debugging` skill:
   - Reproduce the issue
   - Trace root cause (don't guess)
   - Identify the minimal fix

3. **Fix and verify**:
   - Write a failing test that reproduces the bug
   - Apply the minimal fix
   - Verify test passes
   - Run full test suite

4. **Update the issue doc** with root cause and fix description

5. **Commit** with message: `fix: <description> (closes #issue-date)`

**Bug to fix:** $ARGUMENTS
