#!/usr/bin/env bash
set -euo pipefail

# List recent runs for the remove-role-column workflow.
# Requires: curl, jq, and GITHUB_TOKEN env var.

usage() {
  cat <<EOF
Usage: $0 --owner OWNER --repo REPO [--per-page N]

Environment:
  GITHUB_TOKEN  (required)
EOF
  exit 1
}

OWNER=""
REPO=""
PER_PAGE=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --per-page) PER_PAGE="$2"; shift 2;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [[ -z "$OWNER" || -z "$REPO" ]]; then
  usage
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN not set" >&2
  exit 2
fi

API_URL="https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/remove-role-column.yml/runs?per_page=${PER_PAGE}"

curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" "$API_URL" | \
  jq '.workflow_runs[] | {id: .id, status: .status, conclusion: .conclusion, event: .event, html_url: .html_url, created_at: .created_at, run_number: .run_number}'
