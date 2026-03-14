---
name: debug
description: "Systematically debug a bug or test failure. Root cause analysis first."
argument-hint: "[error description or test name]"
---

Use the `superpowers:systematic-debugging` skill.

**Project context:**
- Backend tests: `cd backend && python -m pytest tests/ -v`
- Frontend build: `npx tsc -b && npm run build`
- Backend logs: check uvicorn output
- Database: SQLite at `backend/yoga_guru.db`

**Issue to debug:** $ARGUMENTS
