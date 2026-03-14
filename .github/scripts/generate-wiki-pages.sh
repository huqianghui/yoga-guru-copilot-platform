#!/usr/bin/env bash
# Generate dynamic wiki pages from project data.
# Called by sync-wiki.yml CI workflow.
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
WIKI_DIR="$REPO_ROOT/wiki"

# Cross-platform sed -i
sedi() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

# Count stats
TEST_COUNT=$(find "$REPO_ROOT/backend/tests" -name "test_*.py" -type f 2>/dev/null | wc -l | tr -d ' ')
PAGE_COUNT=$(find "$REPO_ROOT/frontend/src/pages" -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
ROUTER_COUNT=$(find "$REPO_ROOT/backend/app/routers" -name "*.py" -not -name "__init__.py" -type f 2>/dev/null | wc -l | tr -d ' ')
MODEL_COUNT=$(find "$REPO_ROOT/backend/app/models" -name "*.py" -not -name "__init__.py" -not -name "base.py" -type f 2>/dev/null | wc -l | tr -d ' ')
PLAN_COUNT=$(find "$REPO_ROOT/docs/superpowers/plans" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

echo "Stats: routers=$ROUTER_COUNT models=$MODEL_COUNT tests=$TEST_COUNT pages=$PAGE_COUNT plans=$PLAN_COUNT"

# Update Home.md stats
if [ -f "$WIKI_DIR/Home.md" ]; then
  sedi "s/- \*\*Backend\*\*: [0-9]* 个 API 路由.*/- **Backend**: ${ROUTER_COUNT} 个 API 路由, ${MODEL_COUNT} 个 ORM 模型, ${TEST_COUNT} 个测试文件/" "$WIKI_DIR/Home.md"
  sedi "s/- \*\*Frontend\*\*: [0-9]* 个页面组件.*/- **Frontend**: ${PAGE_COUNT} 个页面组件/" "$WIKI_DIR/Home.md"
  sedi "s/- \*\*Plans\*\*: [0-9]* 个实施计划.*/- **Plans**: ${PLAN_COUNT} 个实施计划/" "$WIKI_DIR/Home.md"
  echo "Updated Home.md stats"
fi

echo "Done."
