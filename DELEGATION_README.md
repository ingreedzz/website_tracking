 # Delegation README — GitHub App & Agent Instructions

 Purpose
 - Prepare a scoped GitHub App and brief runbook so a delegated cloud agent or stakeholder can safely dispatch the owner-only migration workflow (the `remove_role` workflow) and run tests. This document explains the recommended GitHub App manifest, required secrets, and how the delegated agent can dispatch and monitor workflows.

 Important note
 - This repository already has Supabase repository secrets configured for running DB operations (e.g., `SUPABASE_SERVICE_ROLE`). Do NOT overwrite or rotate them unless you are the owner.

 Recommended delegation method (preferred)
 - Create a GitHub App (scoped, auditable, revocable). The manifest for a recommended minimal app is provided at `.github/github_app_manifest.json`.
 - Permissions the app needs:
   - `workflows`: write (to dispatch workflows)
   - `actions`: read (to read run metadata)
   - `contents`: read (if the agent needs to read files)
   - `issues`: read (optional, for reporting)
 - Webhook events: `workflow_run` recommended (optional)

 Stakeholder steps to create and install the GitHub App
 1. Go to: https://github.com/settings/apps/new/choose and choose "Create GitHub App from manifest".
 2. Open `.github/github_app_manifest.json` in this repo (or copy its contents) and paste into the manifest form.
 3. Set the App name and owner as desired. Leave the webhook URL blank if you don't need webhooks.
 4. Create the App and then install it on the `ingreedzz/website_tracking` repository (Install App → Choose repository).
 5. On the App's page generate a private key and download it. Keep this key secure — it is the credential used to mint installation tokens.

 How the delegated agent obtains an installation access token (high-level)
 - The agent (or an operator) must exchange a JWT (signed with the App private key) for an installation access token:
   1. Build a JWT signed with the App private key (expiring in 10 minutes). See https://docs.github.com/en/developers/apps/authenticating-with-github-apps for details.
   2. Call: `POST /app/installations/{installation_id}/access_tokens` with the JWT to receive an installation access token.
   3. Use the installation token to call Actions endpoints (dispatch workflows, list runs, download logs).

 Simpler fallback (faster to set up): use a short-lived PAT
 - If you prefer a quick setup, create a Personal Access Token (PAT) with `repo` and `workflow` scopes, and store it as a repo secret (name it `DELEGATE_PAT`). This is less secure and less auditable than a GitHub App, but works for immediate needs.

 Dispatching the `remove_role` workflow (example)
 - Replace `OWNER` and `REPO` with `ingreedzz/website_tracking` and set `$TOKEN` (installation token or PAT):

 ```bash
 curl -X POST \
   -H "Authorization: Bearer $TOKEN" \
   -H "Accept: application/vnd.github+json" \
   https://api.github.com/repos/ingreedzz/website_tracking/actions/workflows/remove-role-column.yml/dispatches \
   -d '{"ref":"main","inputs": {}}'
 ```

 Get workflow runs (to monitor)
 ```bash
 curl -H "Authorization: Bearer $TOKEN" \
   -H "Accept: application/vnd.github+json" \
   "https://api.github.com/repos/ingreedzz/website_tracking/actions/runs?event=workflow_dispatch"
 ```

 Download logs for a run
 ```bash
 curl -L -H "Authorization: Bearer $TOKEN" \
   -H "Accept: application/vnd.github+json" \
   "https://api.github.com/repos/ingreedzz/website_tracking/actions/runs/<run_id>/logs" -o run-<run_id>-logs.zip
 ```

 Agent design & implementation plan (high level)
 1. Authentication
    - Use GitHub App installation token (preferred) or PAT (fallback). If using a GitHub App, implement JWT-based authentication step to get an installation token.
 2. Verify repo secrets & permissions
    - The agent must ensure `SUPABASE_SERVICE_ROLE` and any other necessary secrets are present. The repository already stores Supabase secrets — the agent should verify by attempting a read-only check (e.g., `GET /api/health`).
 3. Dispatch workflow
    - Use the installation token / PAT to call the REST API to dispatch the `remove_role` workflow.
 4. Monitor run
    - Poll `GET /actions/runs` for the run ID, then `GET /actions/runs/{run_id}` to check status until `completed`.
 5. Download and inspect logs
    - Download logs ZIP and parse for success markers defined in the workflow (e.g., 'ROLE REMOVED OK' or backup completion message).
 6. Post-run validation
    - Validate application health by hitting `GET /api/health` and performing a smoke test: register/login → create model → create order (the agent can re-run the same steps used locally).

 Security considerations
 - The App or PAT should only have the minimal scopes described above.
 - Installation tokens are short lived — prefer automation that obtains them dynamically using the App private key.
 - Do NOT add Supabase secrets to logs; avoid printing secrets in outputs.

 Helpful scripts
 - There are helper scripts in `scripts/` (if present) already for dispatching workflows; you can adapt them to use an installation token or PAT. If you prefer, I can add a small wrapper script to exchange a JWT for an installation token and then dispatch the workflow.

 Next steps I can take for you (choose one or more)
 - (A) Add a helper script that exchanges a GitHub App JWT for an installation token and then dispatches the `remove_role` workflow.
 - (B) Add a PAT-based quick `scripts/dispatch_remove_role_with_pat.sh` script that uses `DELEGATE_PAT` from the environment.
 - (C) Leave the manifest and README as-is and assist the stakeholder interactively when they create the App.

 If you want (A) or (B) now, tell me which and I'll add the script and a short usage example.
