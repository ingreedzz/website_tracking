#!/usr/bin/env bash
set -euo pipefail

# Download logs for a workflow run id.
# Usage: get_workflow_logs.sh --owner OWNER --repo REPO --run-id 12345

usage() {
  cat <<EOF
Usage: $0 --owner OWNER --repo REPO --run-id RUN_ID

Environment:
  GITHUB_TOKEN (required)
EOF
  exit 1
}

OWNER=""
REPO=""
RUN_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --run-id) RUN_ID="$2"; shift 2;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [[ -z "$OWNER" || -z "$REPO" || -z "$RUN_ID" ]]; then
  usage
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN not set" >&2
  exit 2
fi

API_URL="https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${RUN_ID}/logs"
OUT_ZIP="workflow_${RUN_ID}_logs.zip"

echo "Downloading logs to $OUT_ZIP"
curl -sL -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" "$API_URL" -o "$OUT_ZIP"

if [[ -s "$OUT_ZIP" ]]; then
  echo "Downloaded $OUT_ZIP"
  echo "You can unzip and inspect the logs: unzip $OUT_ZIP -d workflow_logs_${RUN_ID}"
else
  echo "No logs downloaded or file empty." >&2
  exit 3
fi
