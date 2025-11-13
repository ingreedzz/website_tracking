# Pricing, Unit Price & Manage-Model CRUD — Copy-Paste for Coding Agent

Objective
- Persist `unit_price` on models, compute `total_price` on the server when creating orders (server-side calculation), and add full manage-model CRUD support (list, edit, delete) with a dropdown-based UI for edits.

Summary of requested behavior
1. Models:
   - Add `unit_price` (integer cents) to `models` table (nullable). Provide migration SQL to add this optional column.
   - `size_fields` remain as dynamic fields; allow editing `unit_price` when creating/updating a model.

2. Orders:
   - When creating an order, compute `total_price` server-side using model's `unit_price` and quantity derived from the `product_snapshot` or explicit `quantity` field. Use the model's `unit_price` if present; otherwise, if request includes a `unit_price` use that (fallback).
   - Insert `total_price` into `orders.total` and `order_items` snapshots.
   - Validate amounts: `unit_price` must be positive integer (in cents); `quantity` must be > 0.

3. Backend endpoints (to add/modify):
   - `POST /api/models` — accept optional `unit_price` and `size_fields` (existing behavior) and persist.
   - `PATCH /api/models/:id` — update `name`, `size_fields`, `unit_price`.
   - `DELETE /api/models/:id` — delete model and optionally cascade or prevent deletion if there are related orders (recommendation: prevent deletion when orders exist; return 409 and message `Model in use by orders`).
   - `POST /api/server/orders` — compute totals and persist `orders.total` server-side.

4. Frontend (Dashboard):
   - Create Manage Models panel with dropdown to select an existing model for edit.
   - When a model is selected, populate the form with `name`, `size_fields`, `unit_price` and allow edits.
   - Provide `Save` (PATCH) and `Delete` (DELETE) buttons. Confirm before delete.
   - Show the current `unit_price` when picking a model in the create-order flow and compute live total: `unit_price * quantity`.

Database migration SQL
1. Add `unit_price` to models:
```
ALTER TABLE models
ADD COLUMN IF NOT EXISTS unit_price integer;

-- Optional index for searches by price
CREATE INDEX IF NOT EXISTS idx_models_unit_price ON models(unit_price);
```

2. Optional safeguard migration to prevent accidental deletes of models used in orders:
```
ALTER TABLE orders
ADD CONSTRAINT fk_orders_model
FOREIGN KEY (model_id) REFERENCES models(models_id)
ON DELETE RESTRICT;
```

Backend implementation notes
- Use `supabase.from('models')` and `supabase.from('orders')` consistently and wrap writes in try/catch.
- For computing `total_price` in `POST /api/server/orders`, follow this sequence:
  1. Determine `unit_price`: fetch the `models` row by `models_id`. If the model has `unit_price`, use it. Else, if `req.body.unit_price` provided, validate and use that. Else return 400 `Missing unit price`.
  2. Determine `quantity`: if the request includes `quantity` field use it; else derive from `product_snapshot.quantity` or default to 1. Validate >0.
  3. Compute `total_price = unit_price * quantity` and persist in `orders.total`.

Frontend form changes
- Model create/edit form: add a `Unit price (cents)` numeric input bound to `newModel.unit_price`.
- Create-order form: display `unit_price` and `total` live. When user selects model, fetch `unit_price` and populate; if `unit_price` missing, show an input field to enter unit price.

API endpoints to add (summary)
- `PATCH /api/models/:id` — body: `{ name, size_fields, unit_price }`
- `DELETE /api/models/:id` — soft or hard delete; prefer to implement hard delete but block if orders point to the model (see recommendation above).

Edge cases & recommendations
- Don't assume `unit_price` exists — allow request to include `unit_price` as fallback.
- Use integer cents to avoid floating point rounding issues.
- If orders are expected to keep historical price, store `unit_price` in `order_items` product snapshot.
- Add tests: create model with unit_price, create order referencing it, assert `orders.total` equals `unit_price * quantity` and `order_items` snapshot includes `unit_price`.

Acceptance criteria
1. Models can store and update `unit_price`.
2. Orders created via API calculate `total` server-side correctly and persist `total` in `orders` and include snapshot with `unit_price`.
3. Manage Models UI allows editing and deletion with confirmation and prevents deletion if model has orders.

Example curls
- Add unit price to model (PATCH):
```
curl -X PATCH "http://localhost:3000/api/models/<id>" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"unit_price": 2500}'
```

- Create order (server computes total):
```
curl -X POST "http://localhost:3000/api/server/orders" -H "Authorization: Bearer $TOKEN" -F "model_id=<model_id>" -F "quantity=2" -F "file=@sablon.png"
```

Deliverables
- Migration SQL in `database/migrations/` or `backend/database_migrations/`.
- Backend: `PATCH` and `DELETE` handlers for `/api/models/:id`, updated `POST /api/server/orders` for `total` computation.
- Frontend: Manage Models UI panel + live total display in create-order form.
- Tests: add one or two smoke tests demonstrating total calculation.
