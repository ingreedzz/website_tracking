# Payments & Status Changes — Copy-Paste for Coding Agent

Objective
- Make payment uploads mark the payment and the payment status completed (not the order status), change UI labels from "Upload proof" to "Upload payment", and enforce blocking conditions for payments when orders are not payable.

Summary of requested behavior
1. When a user uploads payment (file) via `POST /api/server/orders/:id/payment`:
   - Create a `payments` row and set `payments.status = 'completed'` when a valid payment file or confirmation is received.
   - Update the corresponding `orders.payment_status` field to `'completed'` (do NOT change `orders.status` — that remains the order life-cycle status).
   - Return the updated order and payment objects in the response.

2. UI changes:
   - Change text label(s) in the payment page/components from `Upload proof` to `Upload payment`.
   - After upload success, show message: `Payment uploaded successfully. Payment status updated to completed.` (NOT "Order status updated...").

3. Block payment for orders that cannot be paid:
   - Conditions to block payment:
     - `order.payment_status === 'completed'` (already paid) → return 409 or 400 with message: `Payment already completed`.
     - `order.status` is not in allowed pay states (e.g., only allow payment when `order.status` is `created` or `confirmed` depending on business rules) → return 400 with message: `Order not payable`.
     - If order `total` or `product_snapshot` is missing, block payment and return 400 with message: `Order incomplete — missing price or product information`.

Files to edit
- `backend/routes/index.js` — update `/server/orders/:id/payment` to set payments.status to `'completed'`, update `orders.payment_status` to `'completed'`, and add blocking logic and clear error messages.
- `src/views/Payment.vue` (or the component that handles payments) — change labels to "Upload payment", update success messages to mention payment status.
- (Optional) `src/views/Dashboard.vue` — ensure orders list shows `payment_status` field separately and displays `Payment Status: completed` where appropriate.

Detailed backend change plan
1. At the start of `/server/orders/:id/payment` handler, validate the order:
   - Query the order: `const { data: orderRow, error } = await supabase.from('orders').select('*').eq('orders_id', orderId).maybeSingle();`
   - If not found → 404; if `order.payment_status === 'completed'` → return 409 `Payment already completed`.
   - If `order.total` is null/0 or `order.order_items` missing product info → return 400 `Order incomplete — missing price or product information`.
   - If `order.status` is not in allowed paying statuses, return 400 `Order not payable`.

2. Upload proof file to storage (existing logic) — on success create the payment object.
   - When inserting into `payments` table, set `status: 'completed'` rather than `pending` if file was provided and saved successfully.

3. Update order's `payment_status` to `'completed'`.
   - `await supabase.from('orders').update({ payment_status: 'completed' }).eq('orders_id', orderId)`.

4. Return response with both `payment` and the updated `order` including `payment_status`.

Detailed frontend change plan
1. Replace label text `Upload proof` → `Upload payment` in `src/views/Payment.vue` and any buttons/tooltips.
2. In the payment upload success path, change the message shown to the user to: `Payment uploaded successfully. Payment status updated to completed.`
3. If the server returns `Payment already completed` or `Order not payable`, show the server message as a user-facing error (not a generic failure message).

Logging string change
- Where code currently logs something like: `Payment uploaded successfully. Order status updated to completed.` change to: `Payment uploaded successfully. Payment status updated to completed.`.

Edge cases & validations
- If payments must be verified before being marked completed in your business flow, implement an extra step (i.e., `payments.status = 'pending'` initially, then separate verification flow) — but user requested immediate completed state on upload, so implement as requested.
- Do not change `orders.status` (order lifecycle) when marking `payment_status` completed.

Acceptance criteria
1. Uploading a payment file sets `payments.status` to `completed` and `orders.payment_status` to `completed`.
2. UI label shows `Upload payment` and success message uses `Payment status updated to completed`.
3. Attempts to pay already-paid orders or incomplete/unpayable orders return clear 4xx responses and user-visible messages.

Sample API examples
- Attempt to upload payment (curl):
```
curl -X POST "http://localhost:3000/api/server/orders/<order_id>/payment" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@payment.jpg" \
  -F "amount=56000"
```

Server response on success (201):
```
{
  "payment": { "payment_id": "...", "status": "completed", ... },
  "order": { "orders_id": "...", "payment_status": "completed", ... }
}
```

Deliverables (commit)
- Backend: updated `/server/orders/:id/payment` handler in `backend/routes/index.js` (with logs and validation changes).
- Frontend: updated `src/views/Payment.vue` labels and success messaging; update `src/views/Dashboard.vue` if needed to display `payment_status` clearly.
- Updated `TESTING_CHECKLIST.md` with manual validation steps for payment flows.

When done, include a short test log that demonstrates:
1. Trying to pay an already-paid order returns `409 Payment already completed`.
2. Paying a payable order results in `payments.status` and `orders.payment_status` equal to `completed` and UI shows the updated message.
