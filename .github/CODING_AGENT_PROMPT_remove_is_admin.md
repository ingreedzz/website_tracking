Task: Remove any remaining UI gating that hides the Create Model feature behind admin-only checks and ensure any UI or router logic allows a regular logged-in user to create models from the main Dashboard.

Context:
- The backend already exposes `POST /api/models` and accepts model creation for any authenticated user (the endpoint uses `verifyToken` but not `requireAdmin`).
- The `Dashboard` view (`src/views/Dashboard.vue`) already contains the Create Model UI and a `Create Model` button, but we must scan the codebase for any other places that might hide or disable that functionality based on `is_admin`.

Acceptance Criteria:
1. A user who is logged-in (any user) can see and use the Create Model flow in `Dashboard` without any `is_admin` gating.
2. No UI components or router guards deny access to the Create Model view or button for non-admin users.
3. Tests / manual steps are documented to verify the flow: login as `red@email.com` (or other test user) → open Dashboard → click Create Model → create a model → model appears in the model dropdown.
4. Keep code style consistent with the repo. Add debug logs where appropriate to help trace model creation in dev mode.

Steps for the coding agent (detailed):
1. Search the codebase for occurrences of `is_admin`, `role ===`, `requireAdmin`, and any checks that might gate model creation.
2. If any conditional hides a UI control (e.g., `v-if="isAdmin"`), remove the conditional or invert logic so that Create Model is visible to any logged-in user. Add a short comment noting the change.
3. Verify `src/views/Dashboard.vue` Create Model button is visible and the `createModel` function is reachable for regular users. If `createModel` calls an API that requires admin, modify the call to use the public `POST /api/models` endpoint (it already exists) and ensure authentication is provided via existing `apiPost` helper.
4. Remove or relax any router-level guard that redirects non-admin users away from Dashboard's model creation view. Do not remove admin-only protections for endpoints that must remain admin-only (e.g., `/users`, `/orders` admin list) — only change UI gating.
5. Add or update a short test plan in `TESTING_CHECKLIST.md` or `PROGRESS.md` describing how to manually validate the change (login, create model, create order using the new model).
6. Run dev server (optional if CI not available) and perform a smoke check programmatically: register a test user, login, call `POST /api/models` and then `GET /api/models` to validate model appears.

Files likely to edit:
- `src/views/Dashboard.vue` (ensure create model visible; may already be fine)
- `src/components/*` (search for checks)
- `src/router/index.js` (search for route guards based on admin)

Deliverables (what to commit):
- Code changes that remove gating and keep functionality intact
- A small one-paragraph note in `PROGRESS.md` describing the change and how it was tested
- Optional: a small e2e script (bash) that registers, logs in, creates a model, and verifies it via the API

Constraints & safety:
- Do not change backend permission rules for admin-only endpoints other than making the UI available. Backend must continue requiring admin for truly privileged APIs.
- Keep debug logging minimal and only in development mode (use existing console.log style used in the repo).

When done, report back with the files changed and the manual validation steps you executed.
