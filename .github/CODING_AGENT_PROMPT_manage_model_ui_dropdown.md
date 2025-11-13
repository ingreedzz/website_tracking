# Manage Model UI — Dropdown Edit / Delete (Copy-Paste for Coding Agent)

Objective
- Replace the two-field model edit UX with a dropdown-based Manage Model UI where a user can:
  - Select an existing model from a dropdown
  - Edit the selected model's name, description, size_fields and `unit_price` using the same form controls used for creating a new model
  - See a dashboard/list of all models with a Delete button per model
  - Delete a model with confirmation (handle FK constraints gracefully)

Why
- Users lack context when entering free-form model keys: a dropdown prevents errors and makes it clear which model is being edited.

Acceptance Criteria
1. A new Manage Models view/panel is available from the Dashboard (e.g., `viewMode === 'manageModels'` or a modal)
2. Dropdown shows all models fetched from `GET /api/models` (use the same `modelOptions` source);
3. Selecting a model populates the edit form with that model's current `name`, `description`, `size_fields` and `unit_price`;
4. Editing fields and submitting issues a `PATCH /api/models/:id` request and updates UI on success;
5. A dashboard list of models shows all models with Edit and Delete actions; Delete triggers confirmation, then `DELETE /api/models/:id` (or PATCH to mark archived) and updates UI;
6. Deleting a model referenced by orders returns a clear error or uses soft-delete / archived flag; do not silently break orders.

Files to edit
- `src/views/Dashboard.vue` — add Manage Models panel and dropdown-driven edit form; reuse `newModel` form components for editing where possible.
- `backend/routes/index.js` — ensure `PATCH /models/:id` and `DELETE /models/:id` endpoints exist (safe-update and delete logic).
- (Optional) Add a small component `src/components/ModelManager.vue` to keep Dashboard tidy.

Backend API details
1. PATCH /api/models/:id
   - Input JSON: { name?, description?, size_fields?, unit_price? }
   - Behavior: validate name, sanitize size_fields (array), update model row:
     const { data, error } = await supabase.from('models').update(payload).eq('models_id', id).select().maybeSingle();
   - Return: the updated model object or 4xx/5xx error.

2. DELETE /api/models/:id
   - Behavior: attempt delete. If DB returns FK/constraint error, return 409 with message: `Model referenced by existing orders — archive instead`.
   - Safer alternative: support soft-delete via `archived` boolean column. If implemented, set `archived=true` and return 200.

Frontend UX details
1. Add Manage Models entry point
   - Add a button near the top of the Dashboard: `Manage Models` that switches `viewMode` to `'manageModels'` or opens a modal.

2. Dropdown & edit form
   - Use `modelOptions` (already populated by GET /models) for the dropdown list: show `label` (model.name) and use `models_id` or `key` as value.
   - When a selection occurs:
     - Fetch the full model object (if you already have detailed `modelOptions`, use it) and populate the form fields: `editModel = { ...selectedModel }`.
     - Render size_fields editor exactly like the Create Model UI (add/remove rows, key/label/type/unit inputs).
   - Make `unit_price` an editable numeric field shown near description.
   - Submit action: `PATCH /api/models/:id` with the edited values, and on success reload `GET /models` and update `modelOptions` and dropdown.

3. Models dashboard list
   - Show compact cards or a table listing all models with columns: Name, #size_fields, unit_price, Actions.
   - Each row has an `Edit` button (selects in dropdown / opens modal) and a `Delete` button.
   - Delete flow: show confirmation modal with message: "Delete model 'X'? This cannot be undone and may affect existing orders." If deletion is blocked by FK, show the API message and suggest archiving.

Edge cases & safety
- If `size_fields` column does not exist, backend fallback already present in other handlers — preserve same fallback logic.
- Prevent deleting models that are in active use unless archived: return an explanatory message and do not cascade-delete orders.
- Keep admin-only protections on other APIs; this UI is allowed for logged-in users per existing design, do not relax backend permissions.

Testing
1. Manual:
   - Login as a regular user → Dashboard → Manage Models → select model → edit name/price → save → confirm dropdown updated and new values appear in create-order form.
   - Delete a model with no orders → confirm removed.
   - Attempt delete of a model with orders → verify 409 and UI message.

2. Automated (optional): Add integration tests covering PATCH and DELETE endpoints and UI interactions.

Sample API examples
- PATCH model:
```
curl -X PATCH "http://localhost:3000/api/models/<models_id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kaos Pro","unit_price":30000,"size_fields":[{"key":"lingkar_dada","label":"Lingkar Dada","type":"number","unit":"cm"}]}'
```

- DELETE model:
```
curl -X DELETE "http://localhost:3000/api/models/<models_id>" \
  -H "Authorization: Bearer $TOKEN"
```

Deliverables (commit)
- Backend: route handlers added/updated in `backend/routes/index.js` with tests/logs.
- Frontend: edits to `src/views/Dashboard.vue` (or a new `src/components/ModelManager.vue`) and CSS adjustments.
- Update `PROGRESS.md` with a short note about the change and tests performed.

When finished, include a short runbook of manual validation steps and list of modified files (paths) so I can review or run quick smoke tests.
