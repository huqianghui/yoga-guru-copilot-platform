---
name: delta-spec
description: "Create a delta spec for a new feature or enhancement (post v1.0 workflow)."
argument-hint: "[feature description]"
---

Create a **delta spec** for the requested feature change.

## Workflow

1. Read the baseline design: `docs/superpowers/specs/2026-03-14-yoga-guru-copilot-platform-design.md`
2. Check existing specs in `docs/superpowers/specs/` to avoid conflicts
3. Use `superpowers:brainstorming` skill to design the feature
4. Save the delta spec to: `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
5. The delta spec MUST include:
   - **Baseline reference**: which existing spec/module this extends
   - **What changes**: new models, new endpoints, new pages, modified behavior
   - **What does NOT change**: explicitly list unchanged parts
   - **Migration notes**: if DB schema changes, describe migration strategy
6. After spec approval, invoke `superpowers:writing-plans` to create the plan
7. Commit spec with message: `docs: add delta spec for <feature-name>`

## Delta Spec Template

```markdown
# [Feature Name] — Delta Spec

**Date**: YYYY-MM-DD
**Baseline**: docs/superpowers/specs/2026-03-14-yoga-guru-copilot-platform-design.md
**Affects modules**: [list affected modules]

## Background
[Why this change is needed]

## Changes
[Detailed description of what changes]

## Data Model Changes
[New tables / modified columns / migrations]

## API Changes
[New or modified endpoints]

## UI Changes
[New or modified pages/components]

## Not Changed
[Explicitly list what remains the same]
```

**Feature to design:** $ARGUMENTS
