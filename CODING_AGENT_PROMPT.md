AI Coding Agent Prompt — Implement Order History Display and Attach History to Order API

Overview

This file is the ready-to-run prompt for a delegated coding agent (the "worker"). You (the worker) have read/write access to the repo at /workspaces/website_tracking. Your responsibilities are to implement the feature exactly as specified, run the smoke test locally, commit changes to a new branch, and open a PR with verification logs and safety notes.

Important: be conservative and non-destructive. Do not run schema migrations or destructive SQL unless the human operator explicitly instructs you to, and only after creating backups. If a migration is required, document it and request operator approval.

Repo details

- Root: /workspaces/website_tracking
- Main branch: `main`
- Files you are allowed to edit (primary):
  - `backend/routes/index.js` (may be referenced in some places as `index.js`)
  - `src/views/OrderDetail.vue`
  - `tmp/order_status_smoketest.js` or add `tmp/order_status_smoketest_history.js`
  - `PROGRESS.md`

Goal

- Attach `history` array to GET `/api/server/orders/:id` output, containing rows from `order_status_history` for that order.
- Render those history entries in `OrderDetail.vue` as a simple timeline.
- Add debug logs and a smoke test verifying the end-to-end behavior.
- Keep backward-compatible behavior and graceful fallback when DB columns/table missing.

Mandatory constraints

1. Create a new branch before editing: `ai-agent/order-history-ui-YYYYMMDD-HHMM` (use timestamp).
2. Commit message pattern: `feat(order-history): <brief description>`.
3. Do not change DB schema automatically. If migration is necessary, create a backup and document the migration SQL but do not execute it.
4. Use existing logging conventions:
   - Server logs: `[REQ:<requestId>] ...` prefix (see `backend/routes/index.js`).
   - Client logs: `console.log('[orderDetail] ...')`.
5. If the Supabase query fails because the relation/columns do not exist, set `history = []` and continue; log the error.
6. Add/modify only the files listed unless absolutely necessary; keep changes minimal.

Step-by-step implementation plan (execute in order)

1) Create branch

Run these commands locally (or in the agent environment):

```bash
git checkout -b ai-agent/order-history-ui-$(date +%Y%m%d-%H%M)
```

2) Server change: attach history to GET `/orders/:id`

File: `backend/routes/index.js`

- Locate the existing route handler `router.get('/orders/:id', ...)`.
- After the code builds `normalized` (the object returned to the client) and before `res.json(normalized);`, insert logic to fetch `order_status_history` rows and attach them as `normalized.history`.
- Use the Supabase client variable already present in the file (named `supabase`).
- Query fields: `order_status_history_id, order_id, old_status, new_status, changed_by, changed_by_id, changed_by_email, changed_by_name, note, customer_name, product, order_name, payment_status, created_at`.
- Filter: `.eq('order_id', id)` and order by `created_at` descending.

Insert this code (adapt variable names to match the handler's `requestId` and `id` variables):

```javascript
// Fetch history and attach it to the normalized order
try {
  console.log(`[REQ:${requestId}] [ORDERS/:id] Fetching history for order ${id}`);
  const { data: historyRows, error: historyErr } = await supabase
    .from('order_status_history')
    .select('order_status_history_id, order_id, old_status, new_status, changed_by, changed_by_id, changed_by_email, changed_by_name, note, customer_name, product, order_name, payment_status, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  if (historyErr) {
    console.warn(`[REQ:${requestId}] [ORDERS/:id] Failed to fetch history:`, historyErr && historyErr.message);
    normalized.history = [];
  } else {
    console.log(`[REQ:${requestId}] [ORDERS/:id] History rows retrieved:`, historyRows?.length || 0);
    normalized.history = Array.isArray(historyRows) ? historyRows : [];
  }
} catch (e) {
  console.warn(`[REQ:${requestId}] [ORDERS/:id] Exception while fetching history:`, e && e.message);
  normalized.history = [];
}
```

- Behavior: always attach `normalized.history` (array). Do not throw on missing table/columns.

3) Frontend change: display history timeline

File: `src/views/OrderDetail.vue`

- In `loadOrder()` the code already calls `apiGet('/orders/${id}')` and sets `order.value = data`.
- After setting `order.value = data`, add a debug log:

```javascript
console.log('[orderDetail] loaded order', order.value?.id, 'historyCount=', order.value?.history?.length || 0)
```

- Add a template block below the existing Status Update form or below order details. Use this fragment (adapt indentation to file style):

```vue
<!-- Order History -->
<div class="mt-6 p-4 border rounded bg-white">
  <h3 class="font-semibold mb-2">Order History</h3>
  <div v-if="loading">Loading history…</div>
  <div v-else-if="!order.history || order.history.length === 0">No history available.</div>
  <div v-else class="space-y-3">
    <div v-for="h in order.history" :key="h.order_status_history_id" class="p-3 border rounded">
      <div class="text-xs text-gray-500">{{ formatDate(h.created_at) }}</div>
      <div class="mt-1"><strong>By:</strong> {{ h.changed_by_name || h.changed_by_email || h.changed_by }}</div>
      <div class="mt-1"><strong>Transition:</strong> {{ h.old_status || '-' }} → {{ h.new_status }}</div>
      <div v-if="h.note" class="mt-1 text-sm"><strong>Note:</strong> {{ h.note }}</div>
      <div class="mt-1 text-sm text-gray-600">
        <span v-if="h.payment_status"><strong>Payment:</strong> {{ h.payment_status }}</span>
        <span v-if="h.product" class="ml-2"><strong>Product:</strong> {{ h.product }}</span>
      </div>
    </div>
  </div>
</div>
```

- Use `formatDate()` already present in the file.
- Do not change the status update form behavior; leave inputs and submission as-is.

4) Client debugging & errors

- Ensure `loadOrder()` catches errors (existing) and logs them with `console.error('[orderDetail] loadOrder error', e)`.
- Add the log after successful load (as described above).

5) Smoke test

- Create a new test file: `tmp/order_status_smoketest_history.js`.
- The test should perform these steps:
  1. Register a test user (POST `/api/server/register` or reuse project's helper if available).
  2. Login to get token (POST `/api/server/login`).
  3. Create an order via `POST /api/server/orders` (multipart if file required; you can reuse a small dummy file or skip file upload if server allows). If the server requires a file, reuse an existing small image in repo or generate a tiny text file and set correct content type.
  4. Call `PUT /api/server/orders/:id/status` to change the order status (e.g., `created` → `confirmed`) using the token.
  5. Call `GET /api/server/orders/:id` and assert response contains `history` array with at least one element whose `new_status` equals the requested status and which contains `changed_by_id` or `changed_by_email`.

- The script should print `PASS` or `FAIL` with details and exit 0 on pass, non-zero on fail.
- Make the script tolerant: if the `order_status_history` fetch fails due to missing relation/columns, print a clear message and exit non-zero (so the PR will catch the missing migration).

6) Update `PROGRESS.md`

- Add an entry including:
  - What you changed (files modified)
  - Smoke test results (paste output)
  - Any DB error encountered and instructions/recommendation (e.g. run migration `backend/database/migrations/20251114_add_order_status_history_fields.sql` after backup).

7) Commit, push, and open a PR

- Commit only the intended files. Example commands:

```bash
git add backend/routes/index.js src/views/OrderDetail.vue tmp/order_status_smoketest_history.js PROGRESS.md
git commit -m "feat(order-history): return and display order history on order detail"
git push --set-upstream origin ai-agent/order-history-ui-$(date +%Y%m%d-%H%M)
```

- Create a PR with title: `feat(order-history): return & display order history on order detail`.
- In the PR description include:
  - One-line summary.
  - Files changed.
  - Smoke test output + how to run it.
  - Safety notes: no schema changes performed; fallback behavior used. If DB migration is needed, attach migration filename and instructions.

Acceptance criteria (automated checks)

- GET `/api/server/orders/:id` returns `history` field (array).
- `OrderDetail.vue` renders history entries when present.
- Smoke test passes verifying a status change is recorded and visible via GET.
- No unrelated files changed.

Safety checklist (must be followed)

- If you need to modify DB schema, require operator approval first.
- Before any schema DDL: take a backup of `order_status_history`:

```bash
pg_dump --table=order_status_history --schema=public --format=p --file=backup_order_status_history_$(date +%Y%m%d).sql $DATABASE_URL
```

- Use `IF NOT EXISTS` in any DDL and run inside a transaction. Prefer operator to run migrations.
- If you see errors about missing relation/column, do not attempt to ALTER TABLE; instead return fallback `normalized.history = []` and document the error in `PROGRESS.md` and PR.

Error handling rules (must be implemented)

- If `supabase.from('order_status_history')` returns an error mentioning "does not exist" or "column does not exist":
  - Log the full error to server logs with prefix `[REQ:<requestId>] [ORDERS/:id]`.
  - Set `normalized.history = []` and continue returning the order.
  - Add error details to `PROGRESS.md` and the PR description.

Smoke test example (pseudocode)

- The test should use `node` and `axios` or `fetch` to communicate with the local server.
- Be sure to set base URL (e.g., `http://localhost:3000`) and use token in `Authorization: Bearer <token>` header.
- Exit 1 on failure.

Deliverables

- Modified: `backend/routes/index.js`
- Modified: `src/views/OrderDetail.vue`
- Added: `tmp/order_status_smoketest_history.js` (or modified existing test)
- Updated: `PROGRESS.md` with results and safety notes
- Branch: `ai-agent/order-history-ui-YYYYMMDD-HHMM`
- PR opened with test output and safety notes

What to do if you hit DB permission or schema errors

- Stop and capture full error text.
- Do not run any ALTER TABLE.
- Add the error text to `PROGRESS.md` and mention in PR.
- Suggest running the migration file `backend/database/migrations/20251114_add_order_status_history_fields.sql` after backing up the table.

Notes for human reviewers

- The change is intentionally minimal: only returning history and rendering it in the UI.
- If you prefer server-side aggregation or pagination of history, request a follow-up change.

— End of prompt
