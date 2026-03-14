#!/usr/bin/env bash
# Sync superpowers plan tasks to GitHub Project V2.
# Reads plan markdown files and creates/updates project items.
#
# NOTE: PROJECT_ID, STATUS_FIELD_ID, and option IDs must be configured
# after creating the GitHub Project. Update the values below.
set -euo pipefail

# ── Configuration (update after creating the project) ──────────
PROJECT_OWNER="huqianghui"
PROJECT_NUMBER="${YOGA_PROJECT_NUMBER:-7}"
PROJECT_ID="${YOGA_PROJECT_ID:-PVT_kwHOAHBQDM4BRubG}"
STATUS_FIELD_ID="${YOGA_STATUS_FIELD_ID:-PVTSSF_lAHOAHBQDM4BRubGzg_eBgc}"
TODO_OPTION="${YOGA_TODO_OPTION:-f75ad846}"
IN_PROGRESS_OPTION="${YOGA_IN_PROGRESS_OPTION:-47fc9ee4}"
DONE_OPTION="${YOGA_DONE_OPTION:-98236657}"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: Project configuration not set. Set YOGA_PROJECT_ID etc. as repository variables."
  exit 1
fi

MARKER_PREFIX="<!-- yoga-task:"

# ── Helper functions ───────────────────────────────────────────

find_item_by_marker() {
  local marker="$1"
  local items_json="$2"
  echo "$items_json" | jq -r \
    --arg name "$marker" \
    '.items[] | select(.content.body != null and (.content.body | test($name))) | .id' \
    2>/dev/null | head -1
}

get_item_status_option() {
  local item_id="$1"
  local items_json="$2"
  local status_name
  status_name=$(echo "$items_json" | jq -r \
    --arg id "$item_id" \
    '.items[] | select(.id == $id) | .status' \
    2>/dev/null | head -1)
  case "$status_name" in
    Todo)        echo "$TODO_OPTION" ;;
    "In Progress") echo "$IN_PROGRESS_OPTION" ;;
    Done)        echo "$DONE_OPTION" ;;
    *)           echo "" ;;
  esac
}

create_project_item() {
  local title="$1"
  local marker="$2"
  local body="${MARKER_PREFIX} ${marker} -->"

  gh api graphql -f query='
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body: $body
      }) {
        projectItem { id }
      }
    }
  ' -f projectId="$PROJECT_ID" -f title="$title" -f body="$body" \
    --jq '.data.addProjectV2DraftIssue.projectItem.id'
}

update_item_status() {
  local item_id="$1"
  local option_id="$2"

  gh api graphql -f query='
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }
  ' -f projectId="$PROJECT_ID" \
    -f itemId="$item_id" \
    -f fieldId="$STATUS_FIELD_ID" \
    -f optionId="$option_id" > /dev/null
}

# ── Main ───────────────────────────────────────────────────────
echo "=== Fetching existing project items ==="
ITEMS_JSON=$(gh project item-list "$PROJECT_NUMBER" \
  --owner "$PROJECT_OWNER" \
  --limit 200 \
  --format json 2>/dev/null)

ITEM_COUNT=$(echo "$ITEMS_JSON" | jq '.items | length')
echo "Found $ITEM_COUNT existing items"

CREATED=0
UPDATED=0

echo ""
echo "=== Scanning plan files ==="
for plan_file in docs/superpowers/plans/*.md; do
  [ ! -f "$plan_file" ] && continue
  plan_name=$(basename "$plan_file" .md)
  echo "Processing: $plan_name"

  # Extract task lines: "### Task N: Title"
  while IFS= read -r line; do
    task_num=$(echo "$line" | grep -oE 'Task [0-9]+' | grep -oE '[0-9]+')
    task_title=$(echo "$line" | sed 's/^### Task [0-9]*: //')
    marker="${plan_name}/task-${task_num}"

    item_id=$(find_item_by_marker "$marker" "$ITEMS_JSON")

    if [ -z "$item_id" ]; then
      ITEM_COUNT=$((ITEM_COUNT + 1))
      num=$(printf "%02d" "$ITEM_COUNT")
      full_title="$num - [${plan_name}] Task ${task_num}: ${task_title}"
      echo "  Creating: $full_title"
      item_id=$(create_project_item "$full_title" "$marker")
      if [ -n "$item_id" ]; then
        update_item_status "$item_id" "$TODO_OPTION"
        CREATED=$((CREATED + 1))
      fi
    else
      echo "  Exists: Task ${task_num}: ${task_title}"
    fi
  done < <(grep -E '^### Task [0-9]+:' "$plan_file")
done

echo ""
echo "=== Sync complete ==="
echo "Created: $CREATED items"
echo "Updated: $UPDATED items"
