#!/usr/bin/env bash
set -euo pipefail

# Simple helper to dispatch the remove-role-column workflow.
# Requires: curl, jq, and GITHUB_TOKEN env var set to a PAT or app token.

usage() {
  cat <<EOF
Usage: $0 --owner OWNER --repo REPO --ref REF --confirm "REMOVE ROLE COLUMN" --create-backup true|false

Environment:
  GITHUB_TOKEN  (required) - PAT or App token with repo+workflow permissions

Example:
  GITHUB_TOKEN=ghp_xxx ./trigger_remove_role_workflow.sh --owner my-org --repo website_tracking --ref main --confirm "REMOVE ROLE COLUMN" --create-backup true
EOF
  exit 1
}

OWNER=""
REPO=""
REF="main"
CONFIRM=""
CREATE_BACKUP="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --ref) REF="$2"; shift 2;;
    --confirm) CONFIRM="$2"; shift 2;;
    --create-backup) CREATE_BACKUP="$2"; shift 2;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [[ -z "$OWNER" || -z "$REPO" || -z "$CONFIRM" ]]; then
  usage
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN is not set in the environment." >&2
  exit 2
fi

API_URL="https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/remove-role-column.yml/dispatches"

payload=$(jq -n --arg ref "$REF" --arg confirm "$CONFIRM" --arg create_backup "$CREATE_BACKUP" '{ref: $ref, inputs: {confirm_removal: $confirm, create_backup: $create_backup}}')

echo "Dispatching workflow to $API_URL with ref=$REF create_backup=$CREATE_BACKUP"

resp=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST "$API_URL" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$resp" == "204" ]]; then
  echo "Workflow dispatched successfully. Check Actions UI or use get_workflow_runs.sh to poll."
  exit 0
else
  echo "Unexpected response code: $resp" >&2
  exit 3
fi
