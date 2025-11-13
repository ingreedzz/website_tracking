Task: Implement unit-price support, total price calculation, and update payment flow.

Purpose
- Add per-model `unit_price` so orders have correct `unit_price` and `total_price` values.
- Update the frontend and backend to compute and persist order totals reliably.
- Change payment submission behavior: when a payment proof is uploaded (payment submitted), mark the payment and the order as `completed` and change the UI text from "Upload proof" to "Upload payment".

Context
- Current state: unit prices are hard-coded in the frontend `unitPriceForModel` fallback map inside `src/views/Dashboard.vue`.
- Backend `POST /api/server/orders` accepts `unit_price` and `total_price` fields but frontend sometimes sends 0 because no unit price exists.
- Backend `POST /server/orders/:id/payment` currently creates a payment record with `status: 'pending'` and updates `orders.payment_status` to `'pending'`.

High-level design
1. Data model changes (DB)
   - Add optional `unit_price` numeric column to `models` table.
     - SQL (run as safe migration):
       ALTER TABLE models ADD COLUMN IF NOT EXISTS unit_price numeric;
   - No change required to `orders`/`order_items` schema; we will ensure `order_items.product_snapshot` contains `unit_price`, and `orders.total` stores the computed total.

2. Backend API changes
   - `GET /api/models`: include `unit_price` in response (already returns JSON fields) — ensure normalization
   - `POST /api/models`: accept `unit_price` in payload and insert (existing fallback retry logic should work if column missing)
   - Add `PATCH /api/models/:id` and `DELETE /api/models/:id` for manage-model (see separate prompt)
   - `POST /api/server/orders`:
     - Behavior: if `unit_price` present in request, use it; otherwise, look up model by name in `models` table and use `models.unit_price` if available; if still missing, fall back to provided `unit_price` or to 0 but return a warning in response.
     - Always compute `calculatedTotal = unit_price * quantity` server-side (do not trust client values).
     - Store `unit_price` inside `order_items.product_snapshot.unit_price` and store `orders.total` as the computed total (numeric).

   - `POST /api/server/orders/:id/payment` (payment upload endpoint):
     - When a file/proof is uploaded, create the `payments` row and set `status: 'completed'`.
     - Update the associated `orders` row `payment_status` to `'completed'`.
     - If the payment is created without an attached file (rare), maintain `pending` status.

3. Frontend changes
   - `src/views/Dashboard.vue`
     - On model selection, fetch `unit_price` from `modelOptions` (if the backend model has unit_price) and fill the `unit_price` field shown in the UI.
     - If `unit_price` is not defined for a model, allow the user to input a `unit_price` manually (make the unit price visible and editable when selected model lacks it).
     - Compute `total_price` client-side for immediate feedback but send only the `quantity` and `unit_price` values; the server will recompute and persist the canonical total.
     - Update labels/placeholders:
       - Change the payment upload text/button in Payment UI to "Upload payment" and any related tooltips.

   - `src/views/Payment.vue` (or wherever payment upload UI exists):
     - Update label from "Upload proof" to "Upload payment".
     - After successful upload, show confirmation that payment and order status changed to `completed`.

4. Validation & error handling
   - Backend must validate `unit_price` is numeric and >= 0; `quantity` must be integer >= 1.
   - When server computes total, return response including `unit_price` and `total` so frontend can display canonical values.

5. Acceptance criteria
   - Creating an order with a model that has a `unit_price` should store order with that `unit_price` and `orders.total = unit_price * quantity`.
   - Creating an order where the model has no unit_price but user provides one should store user-provided `unit_price` and compute total.
   - After uploading payment file via `POST /api/server/orders/:id/payment`, payment record status is `completed` and `orders.payment_status` becomes `completed`.
   - Payment UI shows "Upload payment" and displays success state when payment is completed.

6. Migration and rollout plan
   - Add migration SQL to add `unit_price` column to `models` (owner-run, via workflow or psql):
     - ALTER TABLE models ADD COLUMN IF NOT EXISTS unit_price numeric;
   - Optionally backfill unit prices for existing models using a small script mapping model names to prices (only if owner approves).
   - Deploy backend changes and frontend changes together (or in two-step with defensive backend: accept missing column).

7. Tests
   - Unit: API tests for `POST /server/orders` computing totals correctly when `models.unit_price` exists, when user-provided unit_price, and when neither exist.
   - Integration: End-to-end flow (register/login → create model with unit_price → create order → verify order.total, upload payment → verify payment status/order.payment_status completed).

8. Example API calls
   - Create model with unit_price
     curl -X POST http://localhost:3000/api/models -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"T-Shirt Pro","description":"Test model","size_fields":[{"key":"chest","label":"Chest (cm)","type":"number","unit":"cm"}],"unit_price":28000}'

   - Create order (frontend should POST form data; simplified curl with fields):
     curl -X POST http://localhost:3000/api/server/orders -H "Authorization: Bearer $TOKEN" -F "file=@test.jpg" -F "product=Custom Tee" -F "model=T-Shirt Pro" -F "quantity=2" -F "unit_price=28000"

   - Upload payment (payment becomes completed):
     curl -X POST http://localhost:3000/api/server/orders/<order_id>/payment -H "Authorization: Bearer $TOKEN" -F "file=@payment.jpg" -F "amount=56000"

Implementation notes for the coding agent
- Keep backend computations authoritative: recompute totals server-side.
- Reuse existing `supabase` client methods and table names.
- Add server logs similar to existing verbose style.
- Keep UI friendly: show canonical `unit_price` and `total` returned by server on success.

Deliverables
- Backend code changes (routes update): `backend/routes/index.js` (orders, models, payments), tests if present.
- Frontend changes: `src/views/Dashboard.vue` (unit price UI), `src/views/Payment.vue` (label & success handling).
- Migration SQL file: `database/migrations/2025XXXX_add_unit_price_to_models.sql` (owner-run).
- Updated TESTING checklist entries and short verification script examples.

When complete, list files modified and show sample curl outputs proving the flow.
