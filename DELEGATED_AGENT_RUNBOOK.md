Delegated Agent Runbook — Trigger and Read GitHub Actions
=========================================================

Purpose
-------
This runbook explains how a delegated automation agent (or a human operator) can safely trigger the `remove-role-column.yml` workflow and read its status/logs.

Security model
--------------
- The workflow is protected by repository secrets (`SUPABASE_SERVICE_ROLE`, `SUPABASE_URL`).
- Only runs triggered with a token that has repo/workflow access will receive secrets. Runs from forks or from unprivileged tokens will not get secrets.
- Recommended options:
  1. Create a GitHub App for the delegated agent and install it into the repository (recommended for automation).
  2. Or create a Personal Access Token (PAT) with `repo` and `workflow` scopes and store it securely (less preferred for automation but straightforward).

Quick checklist for the delegated agent
--------------------------------------
1. Obtain a GitHub token with appropriate scopes (see below).
2. Make sure the repository `SUPABASE_SERVICE_ROLE` and `SUPABASE_URL` secrets are present.
3. Use the helper scripts in `/scripts` to dispatch the workflow and poll for status.

Required GitHub token scopes
---------------------------
- For a PAT: `repo`, `workflow` (or `repo:status` + `repo`), and `read:org` if needed.
- For a GitHub App: grant the app `actions` and `contents` permissions at installation time.

Files added to repository
-------------------------
- `scripts/trigger_remove_role_workflow.sh` — dispatch the `remove-role-column.yml` workflow using the Actions API.
- `scripts/get_workflow_runs.sh` — list workflow runs for the `remove-role-column.yml` workflow.
- `scripts/get_workflow_logs.sh` — download logs for a specific workflow run ID.

How to trigger (example using PAT)
----------------------------------
Set `GITHUB_TOKEN` to your PAT (or `GITHUB_APP_TOKEN` if using an app installation token) in the environment where the script runs.

Example (local shell):

```
export GITHUB_TOKEN="ghp_..."
# Trigger the workflow (this requires typing exact confirmation input)
./scripts/trigger_remove_role_workflow.sh \
  --owner your-github-username \
  --repo website_tracking \
  --ref main \
  --confirm "REMOVE ROLE COLUMN" \
  --create-backup true
```

How to poll runs and view logs
------------------------------
1. List recent runs:

```
./scripts/get_workflow_runs.sh --owner your-github-username --repo website_tracking
```

2. Download logs for a run ID (replace <run_id>):

```
./scripts/get_workflow_logs.sh --owner your-github-username --repo website_tracking --run-id <run_id>
```

Notes
-----
- The scripts use the GitHub REST API and require `jq` for JSON parsing (available on most CI images). They are intentionally simple and use `curl` so they can run in many environments.
- Do NOT expose the token publicly. Store it in a secure secret store or use a GitHub App instead.
- The workflow will only expose the Supabase service role secret to runs started from the repository (not forks) and when the token has proper permissions.

If you want, I can also prepare an example GitHub App manifest or a serverless runner that uses a GitHub App installation token to dispatch the workflow. Choose `PAT` or `GitHub App` and I will add the next artifacts.
