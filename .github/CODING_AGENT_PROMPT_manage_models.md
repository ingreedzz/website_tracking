Task: Implement manage-model CRUD (edit and remove existing models) on backend and frontend.

Purpose
- Allow users to edit existing models (name, description, size_fields, unit_price) and delete models from the Dashboard UI.
- Provide safe server-side endpoints and UI flows for editing/removing models.

Context
- Backend currently exposes `GET /api/models` and `POST /api/models`. There's no dedicated `PATCH` or `DELETE` methods for models.
- Frontend `Dashboard` contains a Create Model UI; we will add edit/delete controls and a small modal or inline edit UI.

High-level design
1. Backend API additions
   - `PATCH /api/models/:id`
     - Accepts `name`, `description`, `size_fields`, `unit_price`.
     - Validate inputs, update row using `supabase.from('models').update(...).eq('models_id', id).select().maybeSingle()`.
     - Return updated model representation.

   - `DELETE /api/models/:id`
     - Deletes the model row: `supabase.from('models').delete().eq('models_id', id)`.
     - If model is referenced by existing orders, do NOT cascade-delete order_items — instead either prevent delete and return 409 with message or mark the model as `archived` (safer).
     - Simpler approach: attempt delete; if DB returns foreign-key constraint error, return 409 with explanatory message advising owner to archive instead.

2. Frontend changes (`src/views/Dashboard.vue`)
   - Add a `Manage Models` view or enhance the Create Model card to include a list of existing models with `Edit` and `Delete` buttons.
   - Edit flow: open inline fields or a modal pre-filled with model data, allow editing `name`, `description`, `size_fields` and `unit_price`, validate input and call `PATCH /api/models/:id`. On success, refresh models.
   - Delete flow: confirm via modal with text "Are you sure? This will remove the model and may affect orders." On confirm, call `DELETE /api/models/:id`. If API returns 409, show message and suggest archiving.

3. UX & safety
   - Require confirmation for delete.
   - Optionally implement a soft-delete (`archived` boolean) instead of hard delete if DB constraints are heavy — server-side change optional.

4. Acceptance criteria
   - Edit: A logged-in user can update model fields and the changes appear in the models list and the order form dropdown.
   - Delete: A logged-in user can delete a model. If deletion is blocked by existing order references, the API returns a clear 409 and the UI displays the message.

5. Tests
   - Integration test for `PATCH` to update model and show change in `GET /api/models`.
   - Integration test for `DELETE` handling both success and foreign-key conflict.

6. Example API calls
   - PATCH:
     curl -X PATCH http://localhost:3000/api/models/<models_id> -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Kaos Pro","unit_price":30000}'

   - DELETE:
     curl -X DELETE http://localhost:3000/api/models/<models_id> -H "Authorization: Bearer $TOKEN"

Implementation notes for the coding agent
- Reuse existing `supabase` client helper used in other endpoints.
- Keep the same verbose logging style used in `backend/routes/index.js` for model endpoints.
- Frontend should reuse existing model form components where helpful.

Deliverables
- Backend changes: `PATCH` and `DELETE` routes added to `backend/routes/index.js`.
- Frontend changes: UI elements in `src/views/Dashboard.vue` to edit and delete models (modal or inline flow), and updates to model reload.
- Tests / instructions to verify the flows.

When done, list files changed and a brief verification log showing a patched model and a deleted model (or handled conflict case).
