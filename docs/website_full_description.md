# Website Full Description — website_tracking

This file is a single, consolidated description of the entire project: infrastructure, frameworks, components, features, APIs, database structure, important scripts, and running/deployment notes. Use it as a quick technical reference or for writing documentation/thesis sections.

---

## 1. High-level overview

- Project name: `website_tracking` (repository root).
- Purpose: Web application to create and manage orders, upload payment proofs, and audit order status changes via an *order status history* (audit trail). Includes admin tools for model management and reporting.
- Main stacks:
  - Frontend: Vue 3 + Vite
  - Backend: Node.js + Express
  - Database & Storage: Supabase (Postgres + Storage)
  - Hosting / CI: frontend built for Vercel, backend deployable on Render; GitHub Actions used for CI and automated workflows

---

## 2. Project structure (important folders and files)

- `src/` — Frontend (Vue) app
  - `main.js` — app entry
  - `App.vue`, `index.html`, `styles.css`
  - `src/views/` — primary page components: `Dashboard.vue`, `OrderDetail.vue`, `Payment.vue`, `OrderStatusHistory.vue`, `AdminDashboard.vue`, etc.
  - `src/components/` — shared UI components (Navbar, etc.)
  - `src/router/` — Vue Router definitions
  - `src/lib/` — client libs (e.g., Supabase helper)

- `backend/` — Express server and DB helpers
  - `server.js` — server entry
  - `routes/index.js` — primary HTTP route handlers for orders, payments, users, models
  - `db.js`, `create_db.js` — DB connection / migrations helpers
  - `supabaseClient.js` — Supabase interaction helpers
  - `database/` — migrations SQL files
  - `scripts/` — helper scripts (diagnose, create-admin, check-columns, etc.)

- `tmp/` — smoke tests and test scripts (e.g., `order_status_smoketest.js`, `smoke-test.js`)
- `thesis/` — thesis drafts and related docs
- `docs/` — documentation (created file goes here)
- `PROGRESS.md` — changelog and implementation notes
- `package.json` — project scripts and dependencies

---

## 3. Infrastructure & deployment

- Local development:
  - Frontend: `npm run dev` (Vite dev server)
  - Backend: `npm run start` runs `node backend/server.js` (server entry)
- Builds:
  - `npm run build` creates a production build of the frontend (Vite)
  - `npm run vercel-build` invokes `vercel-build.sh` if used for Vercel
- Recommended hosting in repo notes:
  - Frontend: Vercel (static assets)
  - Backend: Render (Express app)
- CI/automation:
  - GitHub Actions workflows exist for: smoke tests, remove-role migration workflow, and other automation described in `PROGRESS.md`.
- Dev container: workspace is in a devcontainer (Ubuntu 24.04.2 LTS available).

---

## 4. Tech stack details

- Frontend
  - Vue 3 with Single File Components
  - Vite for dev/build
  - Tailwind CSS for styles (configured via `tailwind.config.cjs`)
  - Vue Router for navigation
  - Uses `@supabase/supabase-js` for any client-side Supabase interactions

- Backend
  - Node.js (Express)
  - Uses `@supabase/supabase-js` and `postgres`/REST SQL for DB operations
  - Multer for file upload handling
  - JWT for authentication (`jsonwebtoken`)
  - Bcrypt for password hashing
  - dotenv for env config

- Database & Storage
  - Supabase (Postgres) is primary database
  - Supabase Storage used for storing images / payment proofs

- Tools
  - Axios for server-to-server HTTP
  - Pandoc is referenced in docs for Markdown → Word conversion

---

## 5. Authentication & authorization

- Authentication: JWT tokens issued at login/registration endpoints. Tokens include `users_id`, `email`, `role` and `is_admin` (code derives `role` from `is_admin` when `role` absent).
- Authorization: Many routes use `verifyToken` middleware (backend). Admin checks are implemented using `is_admin` (or fallback to `role==='admin'`).
- Admin helpers: `backend/scripts/create-admin.js` and `ADMIN_TESTING_GUIDE.md` provide ways to create admin accounts for testing.

---

## 6. Logging and diagnostics

- Logging convention (backend): messages are prefixed with `[REQ:<requestId>] [TAG] <message>`. This allows request correlation across handlers and scripts.
- Extensive debug logging added across routes and scripts for step-by-step tracing.
- Diagnostic scripts in `backend/scripts/` (e.g., `diagnose.js`, `check-columns.js`) to validate environment and DB schema.

---

## 7. Core features and user flows

- Order creation: customers can create an order (POST `/server/orders`) including product/model/size fields and optional `customer_name`/`order_name`.
- Payment upload: customers upload payment proof files (POST `/server/orders/:id/payment`), files stored in Supabase Storage; server returns public URLs.
- Status updates: admin or authorized users can update order status via PUT `/server/orders/:id/status` (with optimistic concurrency via `expected_current_status` and optional `force` flag for admin override).
- Order status history (audit trail): `order_status_history` table stores change events; endpoints return history for orders. A new centralized endpoint `GET /order-status-history` provides aggregated history for admin dashboards.
- Dashboard & admin UI: Admins can manage models, view orders, and inspect centralized history. Frontend includes `OrderStatusHistory.vue`, `Dashboard.vue`, `OrderDetail.vue`, `AdminDashboard.vue`, `Payment.vue`.
- Dynamic models: `models` table can include `size_fields` JSONB for dynamic form generation.

---

## 8. API endpoints (not exhaustive, representative)

- Auth & users
  - `POST /api/register` — create user (dev/testing accepts optional `role`)
  - `POST /api/login` — returns JWT

- Orders
  - `POST /server/orders` — create order
  - `GET /orders` — admin list orders
  - `GET /user/orders` — user orders
  - `GET /orders/:id` — get order details (includes `history` after recent changes)
  - `PUT /server/orders/:id/status` — update order status and insert `order_status_history` row
  - `POST /server/orders/:id/payment` — upload payment proof and create payment record

- Order history
  - `GET /order-status-history` — admin: aggregated history (limited to recent records for performance)

- Models
  - `GET /models` — list models + `size_fields`
  - `POST /models`, `PATCH/DELETE /models/:id` — model management

- Health & admin scripts
  - diagnostic scripts are executed via node scripts in `backend/scripts/` (not exposed as HTTP by default)

---

## 9. Database schema (key tables and columns)

Notes: exact schema and migrations are in `backend/database/migrations/`. The following summarizes main tables and typical columns used by the app.

- `users` (Supabase auth + profile enhancements)
  - `users_id` (uuid)
  - `email` (text)
  - `name` (text)
  - `phone` (text)
  - `is_admin` (boolean)
  - optionally `role` (string) — code supports either; migration guides exist to remove this column

- `models`
  - `models_id` (uuid)
  - `name` (text)
  - `description` (text)
  - `size_fields` (JSONB) — array of {key,label,type,unit}
  - `unit_price` (numeric) — optional

- `orders`
  - `orders_id` (uuid)
  - `user_id` (uuid)
  - `order_name` (text) — optional descriptive name
  - `customer_name` (text) — optional
  - `product` / `product_snapshot` (json) — product metadata captured at order time
  - `total` (numeric)
  - `payment_status` (text: pending/completed/failed)
  - `status` (text: created/confirmed/printing/shipped/delivered/cancelled etc.)
  - `created_at`, `updated_at`

- `order_items`
  - `order_items_id` (uuid)
  - `order_id` (uuid)
  - `product_snapshot` (json)
  - `quantity`, `unit_price`, `size_fields_data` (json)

- `payments`
  - `payments_id` (uuid)
  - `order_id` (uuid)
  - `status` (text)
  - `proof_path` / `proof_url` (text)
  - `amount` (numeric)
  - `method` (text)

- `order_status_history`
  - `order_status_history_id` (uuid)
  - `order_id` (uuid)
  - `old_status` (text)
  - `new_status` (text)
  - `changed_by` (uuid) — legacy column
  - `changed_by_id` (uuid) — optional
  - `changed_by_email`, `changed_by_name` (text)
  - `customer_name`, `product`, `order_name` (context fields)
  - `payment_status` (text)
  - `note` (text)
  - `created_at` (timestamp)

---

## 10. Migrations & safe fallbacks

- The codebase includes robust fallback logic: many routes attempt operations that include new columns (e.g., `order_name`, `customer_name`, extended `order_status_history` fields) and gracefully retry without them if the schema doesn't include those columns.
- Migrations for added columns are present in `backend/database/migrations/` and `PROGRESS.md` documents which specific migration filenames to run when enabling extended features.

---

## 11. Testing, smoke tests, and QA

- Smoke tests and E2E scripts live in `tmp/` (e.g., `tmp/order_status_smoketest.js`, `smoke-test.js`). They cover flows: register/login, create order, upload payment, update status, verify history.
- GitHub Actions workflows run these tests on PRs and main pushes; artifacts and logs are available via the CI run.

---

## 12. Developer utilities & scripts

- `backend/scripts/create-admin.js` — create/promote admin users for testing
- `backend/scripts/diagnose.js` — environment and DB schema checks
- `backend/scripts/check-columns.js` — check for presence of optional DB columns
- `tmp/*` — smoke tests and test harness scripts

---

## 13. Security and production concerns

- Authentication uses JWT. Sensitive operations require `verifyToken` and admin checks.
- Logging is verbose for debugging; CodeQL flagged formatting issues in some debug logs (documented in `SECURITY_SUMMARY.md`). These are server-side logs only; sensitive strings (passwords) are not logged.
- Recommendations present in repo: add rate-limiting middleware to protect heavy endpoints, add structured logging (Winston/Pino) and masking of PII for production.

---

## 14. How to run locally (quick)

1. Install dependencies:

```bash
npm install
```

2. Start backend (dev):

```bash
# in repo root
npm run start
# or run node backend/server.js directly
```

3. Start frontend (dev):

```bash
npm run dev
```

4. Run smoke tests (example):

```bash
node tmp/order_status_smoketest.js http://localhost:3000
```

Notes: Ensure `.env` contains SUPABASE credentials and any JWT secrets. Diagnostic scripts in `backend/scripts` help verify environment before running.

---

## 15. Where to find key artifacts

- Implementation notes, changelog and high-level entries: `PROGRESS.md`
- Migration SQL files: `backend/database/migrations/`
- Smoke tests: `tmp/`
- Helper scripts: `backend/scripts/`
- Thesis and documentation drafts: `thesis/`

---

## 16. Next recommended actions (if you want me to continue)

- I can convert this file to a Word `.docx` and place it in `thesis/`.
- I can add diagrams into `thesis/img/` (ERD, architecture, Gantt).
- I can run smoke tests locally (if you provide SUPABASE dev creds in environment) and attach sample logs.

---

 (End of `docs/website_full_description.md`)

