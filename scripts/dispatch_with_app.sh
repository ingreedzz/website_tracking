#!/usr/bin/env bash
# Wrapper for scripts/dispatch_with_app.js
set -euo pipefail

# Example usage:
# APP_ID=12345 INSTALLATION_ID=67890 PRIVATE_KEY=./keys/app.pem OWNER=ingreedzz REPO=website_tracking WORKFLOW=remove-role-column.yml REF=main ./scripts/dispatch_with_app.sh

APP_ID=${APP_ID:-}
INSTALLATION_ID=${INSTALLATION_ID:-}
PRIVATE_KEY=${PRIVATE_KEY:-}
OWNER=${OWNER:-ingreedzz}
REPO=${REPO:-website_tracking}
WORKFLOW=${WORKFLOW:-remove-role-column.yml}
REF=${REF:-main}
INPUTS=${INPUTS:-}

if [ -z "$APP_ID" ] || [ -z "$INSTALLATION_ID" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "Missing required env vars. Provide APP_ID, INSTALLATION_ID, PRIVATE_KEY."
  exit 1
fi

node "$(dirname "$0")/dispatch_with_app.js" --app-id "$APP_ID" --installation-id "$INSTALLATION_ID" --private-key "$PRIVATE_KEY" --owner "$OWNER" --repo "$REPO" --workflow "$WORKFLOW" --ref "$REF" ${INPUTS:+--inputs "$INPUTS"}
