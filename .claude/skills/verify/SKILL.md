---
name: verify
description: "Run all checks before claiming work is complete."
---

Use the `superpowers:verification-before-completion` skill.

**Project verification commands:**

```bash
# Backend
cd backend && python -m pytest tests/ -v
# (future: ruff check . && ruff format --check .)

# Frontend
npx tsc -b
npm run build

# Integration
# Start backend: cd backend && python -m uvicorn app.main:app --reload --port 8000
# Start frontend: npm run dev
# Visit http://localhost:5173
```

Run ALL applicable checks. Report results with evidence, not assumptions.
