# Implement Update Order Status (Coding-Agent Prompt)

Objective
- Implement a minimal, secure, auditable `update order status` flow that hardens and documents the existing `PUT /server/orders/:id/status` endpoint. Add guarded transitions, optional optimistic concurrency, clear responses, and improved debug logging. Provide tests (smoke/integration), and update `PROGRESS.md`.

Context & constraints
- This repo already has an endpoint at `PUT /server/orders/:id/status` in `backend/routes/index.js` that updates orders and records history in `order_status_history`. Your job is NOT to rewrite the app — make minimal changes only to harden validation, logging, and testing. Keep DB schema unchanged.
- Use existing conventions: logging style (console.log with `REQ:${requestId}` pattern is used elsewhere), Supabase client (`supabase`), and `requireAdmin` middleware for access control.
- Minimal UI changes may be required to trigger the endpoint (e.g., admin controls), but the priority is backend + tests + logging.

High-level requirements
1. Validate input and allowed transitions.
2. Support optional optimistic concurrency via `expected_current_status` in request body.
3. Validate and sanitize `payment_status` when provided (allowed values: `pending`, `completed`, `failed`, `refunded`).
4. Insert a row into `order_status_history` capturing old/new status, changed_by, note, and timestamp (this exists; ensure it's executed and logged).
5. Log requestId, user, orderId, oldStatus, newStatus, and result at key steps using existing logging style.
6. Return standardized JSON responses and appropriate HTTP status codes (200, 400, 401/403, 409, 500).
7. Add small automated smoke tests and manual test instructions; update `PROGRESS.md`.

Files to edit (minimal)
- `backend/routes/index.js` — primary edits inside handler for `PUT /server/orders/:id/status`:
  - Add allowed-transitions map and validation logic.
  - Add `expected_current_status` check for concurrency.
  - Validate `payment_status` values.
  - Improve logging (use existing `requestId` / `REQ:` pattern). Keep other logic and DB operations unchanged where possible.
- `smoke-test.js` (or create `tmp/order_status_smoketest.js`) — add a small test script using `curl` or `node` to exercise valid and invalid transitions and assert responses.
- `PROGRESS.md` — append a clear summary of what changed, files modified, and test results.

Detailed backend implementation steps
1. Locate the existing handler in `backend/routes/index.js` for `router.put('/server/orders/:id/status', ...)`. Keep the route and middleware as-is (it already uses `verifyToken, requireAdmin`).
2. Add an in-file constant near the route handler that defines allowed transitions. Keep it small and editable, e.g.:
```js
const ALLOWED_TRANSITIONS = {
  created: ['confirmed', 'cancelled'],
  confirmed: ['printing', 'cancelled'],
  printing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  any: ['cancelled']
}
```
3. In the handler, parse body fields: `{ status, note, payment_status, expected_current_status, force }`.
   - `status`: required, target status string.
   - `note`: optional string.
   - `payment_status`: optional string — validate against allowed values: `['pending','completed','failed','refunded']`.
   - `expected_current_status`: optional string for optimistic concurrency check.
   - `force`: optional boolean (admin-only) to override transition rules (use cautiously; prefer explicit permission checks).
4. Fetch the current order row (existing code does this). Extract `oldStatus = orderRow.status || null`.
5. Concurrency check: if `expected_current_status` provided and `expected_current_status !== oldStatus`, return 409 with message `Order status changed concurrently` and include current status in response.
6. Transition validation: if `force` is not true, check whether `status` is allowed from `oldStatus` using `ALLOWED_TRANSITIONS`. Accept transitions if:
   - `ALLOWED_TRANSITIONS[oldStatus]` includes `status`, or
   - `ALLOWED_TRANSITIONS.any` includes `status`, or
   - `oldStatus === status` (no-op allowed),
   - Otherwise return 400 with message `Invalid status transition: ${oldStatus} -> ${status}`.
7. Perform the update via Supabase (use existing pattern): update `orders` row with new `status` and optionally `payment_status`. Use `.update(...).eq('orders_id', orderId).select().maybeSingle()`.
8. If update succeeds, insert into `order_status_history` with `{ order_id: orderId, old_status: oldStatus, new_status: status, changed_by: userId, note }` (existing code does this; ensure it runs and capture any error in logs). If history insert fails, log a warning but still return success.
9. Return 200 with `{ order: updatedOrder, history: historyRow || null }` (consistent with current API). On validation failure return 400, on concurrency 409, on DB error 500.
10. Add structured logs around each of these steps, using the existing pattern, e.g.:
```js
console.log(`[REQ:${requestId}] [ORDER-STATUS] Attempting status update`, { orderId, userId, oldStatus, newStatus: status });
```

Frontend instructions (minimal, optional)
- If a UI trigger does not exist, add a small admin-only select + button in `src/views/OrderDetail.vue` or the admin Orders list (you may already have an admin control). The control should send:
  - PUT `/api/server/orders/:id/status` with JSON `{ status, note?: string, payment_status?: string }` and Authorization header.
- On success, reload the order and show a message; on failure, display server message.

Testing (must be included by the coding agent)
1. Add a smoke test script `tmp/order_status_smoketest.js` (Node) or append to `smoke-test.js` that performs these checks using the running backend and a test admin token (or login flow):
   - Create or find a test order with `status = 'created'`.
   - Call PUT to change to `confirmed` — expect 200 and order.status === 'confirmed', and `order_status_history` has a new row.
   - Attempt invalid transition `created` → `shipped` — expect 400 and message `Invalid status transition`.
   - Test optimistic concurrency: call PUT with `expected_current_status` set to a mismatched value — expect 409.
   - Test updating `payment_status`: set `payment_status: 'completed'` in body and assert orders.payment_status === 'completed' after update.
2. Print clear success/failure lines in the smoke test output for CI readability.

Acceptance criteria
- Admin can update an order's `status` following allowed transitions.
- The update writes into `orders.status` and `order_status_history` and returns the updated order object.
- Invalid transitions return 400; concurrent mismatch returns 409.
- All significant steps are logged with request id, user id, and order ids.
- A smoke test exists and passes locally.

Developer guidance & constraints for the coding agent
- Keep the diff minimal. Edit only the existing status handler and add a small smoke test file. Do not refactor unrelated code.
- Use existing logging conventions in `backend/routes/index.js` (i.e., `const requestId = req.id || 'unknown'` or header-based `x-request-id`).
- Use environment-safe behavior: if Supabase is not configured in test, make tests skip with a clear message rather than failing silently.
- Update `PROGRESS.md` with a concise summary listing the files changed, test results, and commands used.
- Add comments in code briefly describing the allowed transitions map and the concurrency check.

Sample API call examples (curl)
- Valid transition:
```
curl -X PUT "http://localhost:3000/api/server/orders/<ORDER_ID>/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","note":"Payment verified"}'
```

- Optimistic concurrency example (expected_current_status):
```
curl -X PUT "http://localhost:3000/api/server/orders/<ORDER_ID>/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","expected_current_status":"created"}'
```

What to include in the final commit
- Patch to `backend/routes/index.js` with minimal edits and comments.
- `tmp/order_status_smoketest.js` (or changes to `smoke-test.js`) that runs the scenarios above.
- `PROGRESS.md` entry describing the change, files edited, and test results.
- A short note in the commit message: "Harden PUT /server/orders/:id/status — validate transitions, add concurrency check, improve logging, add smoke tests".

When finished, run the smoke test and paste the output in the PR description or as a comment on the commit.

If anything in the repository prevents implementing this (missing `order_status_history` table, different field names), detect those cases and return a short error message describing what to fix first.

End of prompt.

Please follow these instructions exactly and keep changes minimal.
