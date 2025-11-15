# Memory of Website Tracking System

## Summary

**This system is admin-operated only: Admins create and manage orders via the web UI; there is no public customer-facing interface. Admin accounts must be provisioned by the site owner or developer (direct DB insert or backend helper scripts such as backend/scripts/create-admin.js).**

This document provides a comprehensive memory of the **website_tracking** repository—a full-stack order management and tracking system built with Vue.js (frontend), Node.js/Express (backend), and Supabase (PostgreSQL + Storage). Admins use the system to create orders with custom product specifications, upload payment proofs to Supabase Storage, and track order status changes through a detailed audit trail. Admin capabilities include dynamic model management with JSON-defined size fields, centralized order status history dashboards, and comprehensive logging for debugging and compliance. The application uses JWT-based authentication with admin access control, and includes extensive error handling and request tracing. Deployment is designed for Vercel (frontend) and Render (backend), with GitHub Actions automating CI/CD workflows and smoke tests.

---

## Detailed System Architecture and Components

### 1. **Authentication & Authorization**

The system implements JWT-based authentication with admin-only access control:

- **Authentication Flow**: The `POST /api/register` endpoint exists in code for development/testing purposes, but production provisioning of Admin accounts is done by the site owner or developer (direct DB insert or using scripts like `backend/scripts/create-admin.js`). Registration hashes passwords using bcrypt and creates user records in the `users` table. Login via `POST /api/login` validates credentials and issues a JWT token containing `users_id`, `email`, `is_admin`, and optionally `role`.
- **Token Management**: Tokens are stored client-side (localStorage) and included in all authenticated requests via the `Authorization: Bearer <token>` header. The `verifyToken` middleware (backend) validates tokens on protected routes.
- **Authorization**: Admin privileges are determined by the `is_admin` boolean flag (preferred) or fallback to `role === 'admin'`. Code throughout the backend checks these flags to gate admin-only operations like model management and centralized history access.
- **Frontend Auth**: The `src/lib/auth.js` module manages token storage, decoding, and provides `getCurrentUser()` and `getToken()` helpers. The Vue router (`src/router/index.js`) includes a global guard that redirects authenticated users away from login/register pages.

### 2. **Database Schema (Supabase PostgreSQL)**

The application uses Supabase as its PostgreSQL provider. Key tables include:

- **`users`**: Stores admin account profiles with `users_id` (UUID), `email`, `name`, `phone`, `is_admin` boolean (always true for system users). Historically had a `role` column which is being phased out in favor of `is_admin`.
- **`models`**: Defines product models/templates with `models_id`, `name`, `description`, `unit_price` (numeric), and crucially `size_fields` (JSONB)—an array of objects like `[{key, label, type, unit}, ...]` for dynamic form generation. Managed via `backend/routes/index.js` endpoints (`GET/POST/PATCH/DELETE /models`).
- **`orders`**: Core order records with `orders_id`, `user_id`, `product`, `model`, `size`, `color`, `address`, `phone`, `quantity`, `unit_price`, `total_price`, `payment_status` (pending/completed/failed/refunded), `status` (created/confirmed/printing/shipped/delivered/cancelled), `order_date`, `deadline`, `sablon_path` (image path in Supabase Storage), `sablon_url` (public URL), `customer_name`, `order_name`, `custom` (JSON for dynamic size fields data), and timestamps.
- **`order_items`**: Line items for orders, with `order_items_id`, `order_id`, `product_snapshot` (JSON), `quantity`, `unit_price`, `size_fields_data` (JSON).
- **`payments`**: Payment records with `payments_id`, `order_id`, `status`, `proof_path`, `proof_url`, `amount`, `method`.
- **`order_status_history`**: Audit trail for order status changes. Columns: `order_status_history_id`, `order_id`, `old_status`, `new_status`, `changed_by_id` (UUID), `changed_by_email`, `changed_by_name`, `customer_name`, `product`, `order_name`, `payment_status`, `note`, `created_at`. This table provides a complete history of who changed what and when, supporting compliance and debugging.

Database connection is handled via `backend/db.js` (using `postgres` npm package) and `backend/supabaseClient.js` (using `@supabase/supabase-js` for Storage and some table operations). Migrations are stored in `backend/database/migrations/` and referenced in `PROGRESS.md`.

### 3. **Order Creation and Management Flow**

**Order Creation**:
1. Admin fills out the order form in `Dashboard.vue`, selecting a model (e.g., "Kaos Oblong Dewasa") which dynamically loads size fields from `models` table (via `GET /api/models`).
2. Admin enters product details, quantity, color, address, phone, optionally `customer_name` and `order_name`, and uploads a "sablon" image (design/logo).
3. On submit, `Dashboard.vue` constructs a `FormData` object and sends `POST /server/orders` (see `backend/routes/index.js`).
4. **Backend Processing** (`POST /server/orders` in `backend/routes/index.js`):
   - Validates admin authentication and extracts `user_id` from JWT.
   - Uses Multer to handle the uploaded sablon image file.
   - Uploads image to Supabase Storage bucket (`sablon-images`) via `supabase.storage.from(bucket).upload()`.
   - Retrieves public URL for the uploaded image.
   - Inserts order record into `orders` table with all fields (product, model, size, custom JSON, sablon paths/URLs, prices, status='created', payment_status='pending').
   - Optionally inserts a row into `order_status_history` to record the initial "created" status.
   - Returns the created order object to frontend.
5. Frontend receives order, updates local state. The Admin may navigate to `Payment.vue` to upload payment proof or record payment information directly.

**Order Listing**: Admins view orders via `GET /api/orders` (returns all orders for admin). The endpoint `GET /api/user/orders` exists in code but is not intended for external customers and may be used for backward compatibility or internal scripts. `Dashboard.vue` displays orders in a table with sablon image thumbnails fetched from Supabase public URLs.

**Order Detail**: `OrderDetail.vue` fetches a single order via `GET /api/orders/:id`, displays full details including payment proof if uploaded, and provides a form to update order status (see next section).

### 4. **Payment Upload Flow**

**Payment Proof Upload**:
1. After order creation, Admin navigates to `Payment.vue` (or linked from dashboard).
2. Admin selects the order (via query param `?order=<orders_id>`) and uploads a payment proof image (received from customer or recorded).
3. Frontend sends `POST /server/orders/:id/payment` with `FormData` containing the file.
4. **Backend Processing** (`POST /server/orders/:id/payment` in `backend/routes/index.js`):
   - Validates order exists and that the authenticated Admin has permission to upload payment.
   - Uploads file to Supabase Storage (`payment-proofs` bucket).
   - Retrieves public URL.
   - Inserts/updates `payments` table with `proof_path`, `proof_url`, `status='pending'`, `amount`, `method`.
   - Updates `orders.payment_status` to 'pending' or 'completed' based on business logic.
   - Returns payment record and updated order.
5. Frontend confirms upload and shows success message.

### 5. **Order Status Updates and Audit Trail**

**Status Update Flow** (from `OrderDetail.vue` or admin dashboard):
1. Admin selects a new status (e.g., from 'created' to 'confirmed') in the status update form in `OrderDetail.vue`.
2. Optional: Admin sets new `payment_status`, adds a `note`, and can check "force" to skip validation.
3. Frontend sends `PUT /server/orders/:id/status` with payload: `{ status, payment_status?, note?, expected_current_status?, force? }`.
4. **Backend Processing** (`PUT /server/orders/:id/status` in `backend/routes/index.js`):
   - Validates admin is authenticated and has permission.
   - Fetches current order from DB.
   - **Optimistic Concurrency Control**: If `expected_current_status` is provided and doesn't match current status, rejects update (unless `force=true` and user is admin).
   - Updates `orders.status` and optionally `orders.payment_status`.
   - **Inserts Audit Record**: Inserts a new row in `order_status_history` with `old_status`, `new_status`, `changed_by_id`, `changed_by_email`, `changed_by_name`, `customer_name`, `product`, `order_name`, `payment_status`, `note`, `created_at`.
   - Returns updated order.
5. Frontend reloads order and confirms success.

**Centralized Order Status History Dashboard**:
- `OrderStatusHistory.vue` displays a centralized view of all status changes across all orders (admin-only feature).
- Fetches data from `GET /api/order-status-history` which queries `order_status_history` table ordered by `created_at DESC` with optional limit for performance.
- Displays statistics: total changes, unique orders, unique users, changes today.
- Includes search/filter by customer name, product, order name, changed by user, and note.
- Each row shows: timestamp, order name, customer, product, old→new status transition, changed by (name/email), payment status, note, and "View Order" button linking to `OrderDetail.vue`.

### 6. **Logging and Diagnostics**

**Request Tracing**: Every HTTP request gets assigned a unique `request ID` (UUID) via middleware in `backend/server.js`. All logs for that request are prefixed with `[REQ:<requestId>]`, enabling correlation of logs across handlers, database calls, and errors. Logs include:
- Request start: method, URL, query params, headers (redacted auth tokens), IP, timestamp.
- Request finish: status code, duration (ms), response size. Slow requests (>1s) are flagged with warnings.

**Detailed Logging**: Code includes extensive console.log statements with structured prefixes like `[DB_INIT]`, `[Dashboard]`, `[OrderDetail]`, etc. This aids in debugging complex flows (order creation, model loading, status updates) and understanding state transitions.

**Diagnostic Scripts**: `backend/scripts/` contains helper scripts:
- `diagnose.js`: Checks environment variables, database connectivity, and schema.
- `check-columns.js`: Validates presence of optional columns (for migrations).
- `create-admin.js`: Creates or promotes users to admin role for testing.

**Resource Usage Logging**: `backend/utils/logger.js` logs memory and CPU usage at startup, shutdown, and during database initialization.

**Error Handling**: Middleware in `backend/middleware/error.js` provides centralized error logging (`logError`) and error response formatting (`errorHandler`). Errors include stack traces and context in development mode.

### 7. **Dynamic Model Management**

**Model CRUD** (admin-only feature):
- **Create**: `Dashboard.vue` includes a "Create Model" form where admin defines `name`, `description`, `unit_price`, and adds `size_fields` (key, label, type, unit) one by one. On submit, `POST /api/models` creates the model in DB.
- **List**: `GET /api/models` returns all models with `size_fields` as JSONB array. Frontend converts to `modelOptions` array.
- **Update**: "Manage Models" UI in `Dashboard.vue` allows selecting a model, editing its fields, and saving via `PATCH /api/models/:id`.
- **Delete**: Delete button sends `DELETE /api/models/:id`. Backend enforces referential integrity—deletion fails if model is referenced by existing orders (409 Conflict).

**Dynamic Form Generation**: When creating an order, `Dashboard.vue` uses `getFieldsForModel(modelKey)` to retrieve size fields for selected model and dynamically renders input fields (number/text) with labels and units. User input is stored in `form.custom` object and sent as JSON in order payload.

**Fallback Models**: If backend models table is empty or API fails, frontend falls back to hardcoded `fallbackModelOptions` array with predefined models and size fields for backward compatibility.

### 8. **Deployment and Hosting**

**Frontend (Vue.js)**:
- Built with Vite (`npm run build`) producing static assets in `dist/`.
- Designed for deployment to **Vercel** (serverless static hosting).
- `vercel-build.sh` script handles build process.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (backend base URL).

**Backend (Node.js/Express)**:
- Entry point: `backend/server.js`.
- Designed for deployment to **Render** (managed Node.js hosting).
- `render.yaml` defines build and start commands.
- Environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `PORT`, etc.
- Exports Express app for serverless handlers if needed (`module.exports = app`).

**CI/CD**:
- GitHub Actions workflows (`.github/workflows/`) automate:
  - Smoke tests on PRs and main pushes.
  - Role migration workflows.
  - Other automated checks.
- Smoke tests in `tmp/` (e.g., `order_status_smoketest.js`) cover register→login→create order→upload payment→update status→verify history.

**Database Migrations**: SQL migration files in `backend/database/migrations/` are referenced in `PROGRESS.md` with instructions on when/how to run them (e.g., adding `order_name`, `customer_name` columns, adding `order_status_history` columns for audit context).

### 9. **Security Considerations**

- **Authentication**: JWT tokens include user ID and admin flag. Tokens are validated on every protected route.
- **Authorization**: Only Admins access the UI. Admin-only operations are gated by `is_admin` checks. Routes like `/api/user/orders` exist for legacy/testing purposes and should be disabled in production (or restricted to admin-only access).
- **Password Hashing**: Uses bcrypt with cost factor 10.
- **Secrets Management**: Sensitive keys (JWT_SECRET, SUPABASE_KEY) stored in `.env` (not committed to repo). Code redacts secrets in logs.
- **SQL Injection**: Uses parameterized queries via `postgres` library.
- **File Upload**: Multer middleware handles file uploads. Files stored in Supabase Storage with access control.
- **Logging PII**: Debug logs include sensitive fields like email/name—recommended to add PII masking for production (see recommendations).
- **CodeQL Findings**: Security summary (`SECURITY_SUMMARY.md`) documents findings from CodeQL scans (e.g., formatting issues in debug logs). Most are low-severity and addressed with notes to use structured logging in production.

### 10. **Key Repository Files**

**Core Application**:
- `backend/server.js`: Express server entry, middleware setup, route mounting, graceful shutdown, database initialization.
- `backend/routes/index.js`: All HTTP route handlers (auth, orders, payments, models, status history).
- `backend/db.js`: PostgreSQL connection pool using `postgres` library.
- `backend/supabaseClient.js`: Supabase client initialization for Storage and some table operations.
- `src/main.js`: Vue app entry point.
- `src/App.vue`: Root Vue component with Navbar and router-view.
- `src/router/index.js`: Vue Router config with routes and guards.
- `src/views/Dashboard.vue`: Main dashboard for listing orders, creating orders, managing models.
- `src/views/OrderDetail.vue`: Order detail view with status update form and delete button.
- `src/views/OrderStatusHistory.vue`: Centralized admin dashboard showing all status changes.

**Documentation**:
- `docs/website_full_description.md`: Comprehensive technical reference (used as basis for this memory document).
- `PROGRESS.md`: 108KB changelog documenting all features, migrations, and implementation notes.
- `AGENTS.md`: AI agent guidelines and development patterns.
- `technical_overview.md`: High-level system architecture summary.

**Tests & Scripts**:
- `tmp/order_status_smoketest.js`, `smoke-test.js`: E2E smoke tests.
- `backend/scripts/`: Admin creation, diagnostics, column checks.

---

## Inspected Source Snapshots

The following sections contain verbatim copies of the key source files inspected during the deep-dive analysis of this repository. Each file is presented in a code block with repository metadata for reference and reproducibility.

### File: backend/server.js

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/backend/server.js

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { checkDatabaseConnection } = require('./utils/database');
const { initSupabase } = require('./utils/supabase');
const { logError, errorHandler, notFoundHandler } = require('./middleware/error');
const { isPortAvailable, findAvailablePort, logPortInfo } = require('./utils/portChecker');
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;

// Log startup configuration
console.log('='.repeat(80));
console.log('[STARTUP] === Server Initialization Started ===');
console.log('[STARTUP] Timestamp:', new Date().toISOString());
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] Platform:', process.platform);
console.log('[STARTUP] Process ID:', process.pid);
console.log('[STARTUP] Working directory:', process.cwd());
console.log('[STARTUP] Environment:', process.env.NODE_ENV || 'not set');
console.log('[STARTUP] Target port:', port);
console.log('='.repeat(80));

// Initialize Supabase and check connection
async function initializeDatabase() {
    console.log('[DB_INIT] === Database Initialization Started ===');
    console.log('[DB_INIT] Timestamp:', new Date().toISOString());
    
    try {
        // Step 1: Initialize Supabase client
        console.log('[DB_INIT] Step 1: Initializing Supabase client...');
        console.log('[DB_INIT] Environment check:', {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_KEY,
            hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
            hasViteSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY
        });
        
        const startTime = Date.now();
        initSupabase();
        const initDuration = Date.now() - startTime;
        console.log(`[DB_INIT] ✓ Supabase client initialized (${initDuration}ms)`);
        
        // Step 2: Check database connection
        console.log('[DB_INIT] Step 2: Testing database connection...');
        const connStartTime = Date.now();
        const connectionStatus = await checkDatabaseConnection();
        const connDuration = Date.now() - connStartTime;
        
        console.log('[DB_INIT] Connection test results:', {
            status: connectionStatus.status,
            duration: `${connDuration}ms`,
            timestamp: connectionStatus.timestamp,
            error: connectionStatus.error || 'none'
        });
        
        if (connectionStatus.status !== 'connected') {
            throw new Error(`Database connection failed: ${connectionStatus.error}`);
        }
        
        console.log(`[DB_INIT] ✓ Database connected successfully (${connDuration}ms)`);
        console.log('[DB_INIT] === Database Initialization Complete ===');
        
        // Log resource usage after initialization
        logger.logResourceUsage('DB_INIT');
    } catch (error) {
        console.error('[DB_INIT] === Database Initialization Failed ===');
        console.error('[DB_INIT] Error name:', error.name);
        console.error('[DB_INIT] Error message:', error.message);
        console.error('[DB_INIT] Error stack:', error.stack);
        
        if (error.response) {
            console.error('[DB_INIT] Response status:', error.response.status);
            console.error('[DB_INIT] Response data:', error.response.data);
        }
        
        console.error('[DB_INIT] Exiting process due to database initialization failure');
        process.exit(1);
    }
}

// Parse JSON bodies for API routes

console.log('[STARTUP] Configuring middleware...');

// Enable CORS for dev (adjust origin as needed)
console.log('[STARTUP] Setting up CORS middleware');
app.use(cors());

console.log('[STARTUP] Setting up JSON body parser (limit: 10mb)');
app.use(express.json({ limit: '10mb' }));

console.log('[STARTUP] Setting up URL-encoded body parser');
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('[STARTUP] ✓ Basic middleware configured');

// Enhanced request tracing middleware: assigns a request id, logs start and finish with timing
const { randomUUID } = require('crypto');
app.use((req, res, next) => {
    const rid = (req.headers['x-request-id'] || randomUUID());
    req.id = rid;
    const start = Date.now();
    
    // Detailed request logging
    const authPresent = req.headers.authorization ? 'yes' : 'no';
    const contentLength = req.headers['content-length'] || 'unknown';
    const contentType = req.headers['content-type'] || 'none';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log(`[REQ:${rid}] === Request Started ===`);
    console.log(`[REQ:${rid}] Timestamp: ${new Date().toISOString()}`);
    console.log(`[REQ:${rid}] Method: ${req.method}`);
    console.log(`[REQ:${rid}] URL: ${req.originalUrl}`);
    console.log(`[REQ:${rid}] Path: ${req.path}`);
    console.log(`[REQ:${rid}] Query: ${JSON.stringify(req.query)}`);
    console.log(`[REQ:${rid}] Headers:`, {
        'authorization': authPresent,
        'content-type': contentType,
        'content-length': contentLength,
        'user-agent': userAgent.substring(0, 50) // Truncate long user agents
    });
    console.log(`[REQ:${rid}] IP: ${req.ip || req.connection?.remoteAddress || 'unknown'}`);

    // capture response finish to log duration and status
    res.on('finish', () => {
        const dur = Date.now() - start;
        console.log(`[REQ:${rid}] === Request Completed ===`);
        console.log(`[REQ:${rid}] Status: ${res.statusCode}`);
        console.log(`[REQ:${rid}] Duration: ${dur}ms`);
        console.log(`[REQ:${rid}] Response size: ${res.get('content-length') || 'unknown'} bytes`);
        
        // Log slow requests
        if (dur > 1000) {
            console.warn(`[REQ:${rid}] ⚠️  SLOW REQUEST: ${dur}ms for ${req.method} ${req.originalUrl}`);
        }
    });
    
    // Log if response errors occur
    res.on('error', (err) => {
        console.error(`[REQ:${rid}] ❌ Response error:`, err.message);
    });

    next();
});

// API routes
console.log('[STARTUP] Loading API routes...');
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);
console.log('[STARTUP] ✓ API routes configured');

// 404 handler for API routes (must come after all API routes)
console.log('[STARTUP] Configuring 404 handler');
app.use(notFoundHandler);

// Error handling middleware (must come after all routes)
console.log('[STARTUP] Configuring error handlers');
app.use(logError);
app.use(errorHandler);
console.log('[STARTUP] ✓ Error handlers configured');

// Serve static files from the public folder
console.log('[STARTUP] Configuring static file serving');
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for SPA (let client router handle it)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  console.log(`[REQ:${req.id}] SPA fallback: serving index.html for ${req.path}`);
  res.sendFile(indexPath);
});

// Graceful shutdown handler
function setupGracefulShutdown(server) {
  console.log('[STARTUP] Setting up graceful shutdown handlers');
  
  const shutdown = (signal) => {
    console.log(`\n[SHUTDOWN] ${signal} received, starting graceful shutdown...`);
    console.log('[SHUTDOWN] Timestamp:', new Date().toISOString());
    
    // Log resource usage before shutdown
    logger.logResourceUsage('SHUTDOWN');
    
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
      console.log('[SHUTDOWN] Process exiting');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[SHUTDOWN] ⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:');
    console.error('[FATAL] Error name:', err.name);
    console.error('[FATAL] Error message:', err.message);
    console.error('[FATAL] Error stack:', err.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise);
    console.error('[FATAL] Reason:', reason);
    process.exit(1);
  });
  
  console.log('[STARTUP] ✓ Graceful shutdown handlers configured');
}

// Export the app so it can be used by serverless handlers.
module.exports = app;

// If this file is executed directly, run the database initialization and start
// the HTTP server. When imported (for serverless), we only export the app.
if (require.main === module) {
    // Start the server with optional database initialization
    if (process.env.SKIP_DB_CHECK === 'true') {
        console.warn('[STARTUP] ⚠️  SKIP_DB_CHECK=true — starting server without database initialization');
        
        // Check port availability
        logPortInfo(port);
        isPortAvailable(port).then((available) => {
            if (!available) {
                console.error(`[STARTUP] ❌ Port ${port} is not available`);
                console.error('[STARTUP] Attempting to find alternative port...');
                
                return findAvailablePort(port).then((altPort) => {
                    if (altPort) {
                        console.log(`[STARTUP] Using alternative port: ${altPort}`);
                        const server = app.listen(altPort, () => {
                            console.log('='.repeat(80));
                            console.log(`[STARTUP] ✓ Server running at http://localhost:${altPort}`);
                            console.log('[STARTUP] Server started successfully');
                            console.log('[STARTUP] Timestamp:', new Date().toISOString());
                            console.log('='.repeat(80));
                            logger.logResourceUsage('STARTUP');
                        });
                        setupGracefulShutdown(server);
                    } else {
                        console.error('[STARTUP] ❌ No available ports found. Exiting.');
                        process.exit(1);
                    }
                });
            }
            
            const server = app.listen(port, () => {
                console.log('='.repeat(80));
                console.log(`[STARTUP] ✓ Server running at http://localhost:${port}`);
                console.log('[STARTUP] Server started successfully (without DB check)');
                console.log('[STARTUP] Timestamp:', new Date().toISOString());
                console.log('='.repeat(80));
                logger.logResourceUsage('STARTUP');
            });
            setupGracefulShutdown(server);
        }).catch(error => {
            console.error('[STARTUP] ❌ Failed to check port availability:', error);
            process.exit(1);
        });
    } else {
        console.log('[STARTUP] Starting with database initialization...');
        
        initializeDatabase().then(() => {
            console.log('[STARTUP] Database initialization complete, checking port availability...');
            
            // Check port availability before starting server
            logPortInfo(port);
            return isPortAvailable(port);
        }).then((available) => {
            if (!available) {
                console.error(`[STARTUP] ❌ Port ${port} is not available`);
                console.error('[STARTUP] Attempting to find alternative port...');
                
                return findAvailablePort(port).then((altPort) => {
                    if (altPort) {
                        console.log(`[STARTUP] Using alternative port: ${altPort}`);
                        const server = app.listen(altPort, () => {
                            console.log('='.repeat(80));
                            console.log(`[STARTUP] ✓ Server running at http://localhost:${altPort}`);
                            console.log('[STARTUP] Server started successfully');
                            console.log('[STARTUP] Timestamp:', new Date().toISOString());
                            console.log('='.repeat(80));
                            logger.logResourceUsage('STARTUP');
                        });
                        setupGracefulShutdown(server);
                        return server;
                    } else {
                        console.error('[STARTUP] ❌ No available ports found. Exiting.');
                        process.exit(1);
                    }
                });
            }
            
            console.log(`[STARTUP] Port ${port} is available, starting server...`);
            const server = app.listen(port, () => {
                console.log('='.repeat(80));
                console.log(`[STARTUP] ✓ Server running at http://localhost:${port}`);
                console.log('[STARTUP] Server started successfully');
                console.log('[STARTUP] Timestamp:', new Date().toISOString());
                console.log('='.repeat(80));
                logger.logResourceUsage('STARTUP');
            });
            setupGracefulShutdown(server);
            return server;
        }).catch(error => {
            console.error('[STARTUP] ❌ Failed to start server:', error);
            console.error('[STARTUP] Error name:', error.name);
            console.error('[STARTUP] Error message:', error.message);
            console.error('[STARTUP] Error stack:', error.stack);
            process.exit(1);
        });
    }
}```

### File: backend/db.js

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/backend/db.js

```javascript
import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

// create or reuse a global client (helps in serverless / hot-reload environments)
const globalKey = '__PG_CLIENT__';

const sql = globalThis[globalKey] ?? postgres(connectionString, {
  ssl: { rejectUnauthorized: false }, // safe for many hosted DBs like Supabase
  max: 5,             // max connections in pool
  idle_timeout: 60,   // secs before idle connection closes
  connect_timeout: 10 // seconds
});

if (!globalThis[globalKey]) globalThis[globalKey] = sql;

export default sql;```

### File: backend/supabaseClient.js

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/backend/supabaseClient.js

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('[SUPABASE_CLIENT] === Creating Supabase Client ===');
console.log('[SUPABASE_CLIENT] Timestamp:', new Date().toISOString());

// Debug: log env vars (do not log secret in production)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('[SUPABASE_CLIENT] Configuration check:');
console.log('[SUPABASE_CLIENT]   SUPABASE_URL present:', !!supabaseUrl);
console.log('[SUPABASE_CLIENT]   SUPABASE_KEY present:', !!supabaseKey);

if (supabaseUrl) {
    // Redact URL for security
    const redacted = supabaseUrl.replace(/https?:\/\/([^.]+)\..*/, 'https://$1...<redacted>');
    console.log('[SUPABASE_CLIENT]   SUPABASE_URL:', redacted);
}

let supabase = null;

try {
    if (!supabaseUrl || !supabaseKey) {
        console.error('[SUPABASE_CLIENT] ❌ Missing required environment variables');
        console.error('[SUPABASE_CLIENT] Required: SUPABASE_URL and SUPABASE_KEY');
        throw new Error('Supabase credentials not configured');
    }
    
    console.log('[SUPABASE_CLIENT] Creating client with options...');
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    console.log('[SUPABASE_CLIENT] ✓ Client created successfully');
    console.log('[SUPABASE_CLIENT] Client capabilities:', {
        hasAuth: !!supabase.auth,
        hasStorage: !!supabase.storage,
        hasFrom: typeof supabase.from === 'function',
        hasRpc: typeof supabase.rpc === 'function'
    });
    
} catch (err) {
    console.error('[SUPABASE_CLIENT] ❌ Failed to create client');
    console.error('[SUPABASE_CLIENT] Error name:', err.name);
    console.error('[SUPABASE_CLIENT] Error message:', err.message);
    if (err.stack) {
        console.error('[SUPABASE_CLIENT] Error stack:', err.stack);
    }
}

console.log('[SUPABASE_CLIENT] === Client Initialization Complete ===');

module.exports = supabase;```

### File: src/main.js

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/main.js

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

createApp(App).use(router).mount('#app')
```

### File: src/App.vue

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/App.vue

```vue
<template>
  <div class="app">
    <Navbar />
    <main>
      <router-view />
    </main>
    <footer class="site-footer">© <span>{{ new Date().getFullYear() }}</span> — Chiangho Tracking Order</footer>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue'

export default {
  name: 'App',
  components: { Navbar }
}
</script>

<style>
.site-header { padding: 1rem; background:#0f172a; color:#fff }
.site-header nav a { color:#9ca3af; margin:0 .5rem }
main { padding: 1.5rem }
.site-footer { padding: 1rem; text-align:center; color:#6b7280 }
</style>

```

### File: src/router/index.js

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/router/index.js

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../lib/auth'
import Home from '../views/Home.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'
import OrderDetail from '../views/OrderDetail.vue'
import OrderHistory from '../views/OrderHistory.vue'
import OrderStatusHistory from '../views/OrderStatusHistory.vue'
import Payment from '../views/Payment.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/register', name: 'Register', component: Register },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/payment', name: 'Payment', component: Payment },
  { path: '/login', name: 'Login', component: Login },
  { path: '/orders/:id', name: 'OrderDetail', component: OrderDetail, props: true },
  { path: '/orders/:id/history', name: 'OrderHistory', component: OrderHistory, props: true },
  { path: '/order-status-history', name: 'OrderStatusHistory', component: OrderStatusHistory }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global guard: redirect authenticated users away from login/register pages
router.beforeEach((to, from, next) => {
  const user = getCurrentUser()
  if (user && (to.name === 'Login' || to.name === 'Register')) {
    // All users go to regular dashboard now (no admin dashboard)
    return next({ name: 'Dashboard' })
  }
  next()
})

export default router
```

### File: src/views/Dashboard.vue

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/views/Dashboard.vue

```vue
<template>
  <section class="dashboard container py-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Dashboard</h2>
      <div class="space-x-2">
        <button @click="viewMode = 'create'" class="px-3 py-2 bg-blue-500 text-white rounded">Make New Order</button>
        <button @click="goToOrderStatusHistory" class="px-3 py-2 bg-indigo-600 text-white rounded">Order Status History</button>
        <button @click="viewMode = 'list'" class="px-3 py-2 bg-gray-700 text-white rounded">Show Orders</button>
        <button @click="viewMode = 'createModel'" class="px-3 py-2 bg-green-600 text-white rounded">Create Model</button>
        <button @click="viewMode = 'manageModels'" class="px-3 py-2 bg-purple-600 text-white rounded">Manage Models</button>
        <button @click="logout" class="px-3 py-2 bg-red-500 text-white rounded">Log out</button>
      </div>
    </div>

    <!-- Create Model -->
    <div v-if="viewMode === 'createModel'" class="mb-6 bg-white border-2 border-gray-300 p-6 rounded-lg shadow-md">
      <h3 class="text-xl font-bold mb-4">Create New Model</h3>
      
      <!-- Model Basic Info -->
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Model Name (required)</label>
        <input v-model="newModel.name" placeholder="e.g., Kaos Oblong Dewasa" class="w-full border rounded px-3 py-2" />
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Description</label>
        <input v-model="newModel.description" placeholder="e.g., Adult t-shirt with custom sizing" class="w-full border rounded px-3 py-2" />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Unit Price (optional)</label>
        <input v-model="newModel.unit_price" type="number" min="0" step="1000" placeholder="e.g., 28000" class="w-full border rounded px-3 py-2" />
        <p class="text-xs text-gray-500 mt-1">Price per unit in Rupiah. Leave empty if price varies.</p>
      </div>

      <!-- Dynamic Size Fields Builder -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium">Size Fields</label>
          <button @click="addSizeField" type="button" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
            + Add Field
          </button>
        </div>

        <!-- List of Size Fields -->
        <div v-if="newModel.size_fields.length === 0" class="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
          No size fields added yet. Click "+ Add Field" to add custom size fields for this model.
        </div>

        <div v-for="(field, index) in newModel.size_fields" :key="index" class="mb-3 p-3 bg-gray-50 rounded border">
          <div class="grid grid-cols-12 gap-2">
            <div class="col-span-3">
              <label class="block text-xs text-gray-600 mb-1">Field Key</label>
              <input v-model="field.key" placeholder="e.g., lingkar_dada" class="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div class="col-span-3">
              <label class="block text-xs text-gray-600 mb-1">Field Label</label>
              <input v-model="field.label" placeholder="e.g., Lingkar Dada" class="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">Type</label>
              <select v-model="field.type" class="w-full border rounded px-2 py-1 text-sm">
                <option value="number">Number</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">Unit</label>
              <input v-model="field.unit" placeholder="e.g., cm" class="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div class="col-span-2 flex items-end">
              <button @click="removeSizeField(index)" type="button" class="w-full px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Example -->
      <div class="mb-4 p-3 bg-blue-50 rounded text-sm">
        <strong>Example size fields:</strong>
        <ul class="mt-1 ml-4 list-disc text-xs text-gray-700">
          <li>Key: lingkar_dada, Label: Lingkar Dada, Type: number, Unit: cm</li>
          <li>Key: panjang_baju, Label: Panjang Baju, Type: number, Unit: cm</li>
          <li>Key: panjang_lengan, Label: Panjang Lengan, Type: number, Unit: cm</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-3">
        <button @click="createModel" type="button" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Model
        </button>
        <button @click="viewMode = 'list'" type="button" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>

      <!-- Status Message -->
      <div v-if="modelCreateMsg" :class="{'text-green-600': modelCreateMsg.includes('success'), 'text-red-600': !modelCreateMsg.includes('success')}" class="mt-3 text-sm font-medium">
        {{ modelCreateMsg }}
      </div>
    </div>

    <!-- Manage Models -->
    <div v-if="viewMode === 'manageModels'" class="mb-6 bg-white border-2 border-gray-300 p-6 rounded-lg shadow-md">
      <h3 class="text-xl font-bold mb-4">Manage Models</h3>

      <div v-if="modelOptions.length === 0" class="text-gray-500 italic">
        No models found. Create a model first.
      </div>

      <div v-else class="grid grid-cols-2 gap-6">
        <!-- Left: selector and info -->
        <div class="space-y-4">
          <label class="block text-sm font-medium">Select Model to Manage</label>
          <select v-model="selectedModelId" @change="onModelSelect" class="w-full border rounded px-3 py-2">
            <option :value="null" disabled>Select a model...</option>
            <option v-for="m in modelOptions" :key="m.models_id" :value="m.models_id">{{ m.name || m.label }}</option>
          </select>

          <div v-if="selectedModel()" class="p-4 border rounded bg-gray-50">
            <h4 class="font-bold text-lg">{{ selectedModel().name }}</h4>
            <p class="text-sm text-gray-600 mt-1" v-if="selectedModel().description">{{ selectedModel().description }}</p>
            <p class="text-sm text-gray-600 mt-1" v-if="selectedModel().unit_price !== null">
              <span class="font-semibold">Unit Price:</span> Rp {{ formatNumber(selectedModel().unit_price) }}
            </p>
            <p class="text-sm text-gray-600 mt-1" v-if="selectedModel().size_fields && selectedModel().size_fields.length > 0">
              <span class="font-semibold">Size Fields:</span>
              <ul class="ml-4 list-disc text-sm">
                <li v-for="f in selectedModel().size_fields" :key="f.key">{{ f.label || f.key }} <span v-if="f.unit">({{ f.unit }})</span></li>
              </ul>
            </p>
          </div>

          <div class="mt-4">
            <button @click="viewMode = 'list'" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Back to Orders</button>
          </div>
        </div>

        <!-- Right: edit/replace form -->
        <div class="p-4 border rounded bg-white">
          <h4 class="font-semibold mb-3">Edit / Replace Model</h4>

          <div v-if="!selectedModel()" class="text-sm text-gray-500">Choose a model on the left to edit or delete.</div>

          <div v-else class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Model Name</label>
              <input v-model="editForm.name" class="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Description</label>
              <input v-model="editForm.description" class="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Unit Price</label>
              <input v-model.number="editForm.unit_price" type="number" min="0" step="1000" class="w-full border rounded px-3 py-2" />
            </div>

            <!-- Size fields editor for editForm -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium">Size Fields</label>
                <button @click="addEditSizeField" type="button" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">+ Add Field</button>
              </div>

              <div v-if="editForm.size_fields.length === 0" class="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">No size fields. Add one to include size fields for this model.</div>

              <div v-for="(field, idx) in editForm.size_fields" :key="idx" class="mb-2 p-2 border rounded bg-gray-50">
                <div class="grid grid-cols-12 gap-2">
                  <div class="col-span-4">
                    <input v-model="field.key" placeholder="key (e.g., lingkar_dada)" class="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div class="col-span-4">
                    <input v-model="field.label" placeholder="label" class="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div class="col-span-2">
                    <select v-model="field.type" class="w-full border rounded px-2 py-1 text-sm">
                      <option value="number">number</option>
                      <option value="text">text</option>
                    </select>
                  </div>
                  <div class="col-span-1">
                    <input v-model="field.unit" placeholder="unit" class="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div class="col-span-1 flex items-end">
                    <button @click="removeEditSizeField(idx)" class="w-full px-2 py-1 bg-red-500 text-white rounded text-sm">Remove</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex space-x-2 mt-3">
              <button @click="saveEditModel()" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save Changes</button>
              <button @click="deleteSelectedModel()" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete Model</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create order -->
    <div v-if="viewMode === 'create'" class="bg-white p-6 rounded shadow">
      <h3 class="font-semibold mb-4">Create Order</h3>
      <form @submit.prevent="handleCreate">
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <div class="text-sm">Product</div>
            <input v-model="form.product" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Model</div>
            <select v-model="form.model" class="w-full border rounded px-3 py-2">
              <option v-for="m in modelOptions" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </label>
          <label class="block">
            <div class="text-sm">Image size (e.g. 1024x768)</div>
            <input v-model="form.size" placeholder="width x height or description" class="w-full border rounded px-3 py-2" />
          </label>
          <!-- dynamic custom fields for selected model -->
          <template v-for="field in getFieldsForModel(form.model)" :key="field.key">
            <label class="block">
              <div class="text-sm">{{ field.label }} <span v-if="field.unit">(cm)</span></div>
              <div class="flex items-center">
                <input :type="field.type === 'number' ? 'number' : 'text'" :step="field.type === 'number' ? '0.1' : undefined" v-model.number="form.custom[field.key]" class="w-full border rounded px-3 py-2" />
                <span v-if="field.unit" class="ml-2 text-sm">{{ field.unit }}</span>
              </div>
            </label>
          </template>
          <label class="block">
            <div class="text-sm">Color</div>
            <input v-model="form.color" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Address</div>
            <input v-model="form.address" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Phone</div>
            <input v-model="form.phone" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Customer Name</div>
            <input v-model="form.customer_name" placeholder="e.g., John Doe" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Order Name</div>
            <input v-model="form.order_name" placeholder="e.g., School Uniform Batch 1" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Quantity (lusin)</div>
            <input v-model.number="form.quantity" type="number" min="1" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Unit price (per lusin)</div>
            <div class="w-full border rounded px-3 py-2">Rp {{ formatNumber(unitPriceForModel(form.model)) }}</div>
          </label>
          <label class="block">
            <div class="text-sm">Total price</div>
            <div class="w-full border rounded px-3 py-2 font-bold">Rp {{ formatNumber(totalPrice()) }}</div>
          </label>
          <label class="block">
            <div class="text-sm">Order deadline</div>
            <input v-model="form.deadline" type="date" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Sablon image (required)</div>
            <input ref="fileInput" @change="onFileChange" type="file" accept="image/*" class="w-full" required />
          </label>
        </div>

        <div class="mt-4 flex items-center space-x-3">
          <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Next / Submit</button>
          <button type="button" @click="resetForm" class="px-4 py-2 bg-gray-300 rounded">Reset</button>
        </div>
      </form>

      <div v-if="previewUrl" class="mt-4">
        <div class="text-sm mb-2">Preview</div>
        <img :src="previewUrl" alt="preview" class="max-w-xs border" />
      </div>
    </div>

    <!-- Orders list / admin view -->
    <div v-if="viewMode === 'list'" class="mt-6 bg-white p-4 rounded shadow">
      <h3 class="font-semibold mb-4">Orders</h3>
      <div v-if="orders.length === 0">No orders yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="p-2 border">Order ID</th>
              <th class="p-2 border">Order Name</th>
              <th class="p-2 border">Customer Name</th>
              <th class="p-2 border">Product</th>
              <th class="p-2 border">Model</th>
              <th class="p-2 border">Size</th>
              <th class="p-2 border">Color</th>
              <th class="p-2 border">Quantity</th>
                  <th class="p-2 border">Status</th>
                  <th class="p-2 border">Unit Price</th>
                  <th class="p-2 border">Total Price</th>
                  <th class="p-2 border">Payment Status</th>
                  <th class="p-2 border">Order Date</th>
                  <th class="p-2 border">Deadline</th>
                  <th class="p-2 border">Sablon</th>
                  <th class="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id || o.orders_id">
              <td class="p-2 border">{{ o.id || o.orders_id }}</td>
              <td class="p-2 border">{{ o.order_name || 'Unknown' }}</td>
              <td class="p-2 border">{{ o.customer_name || 'Unknown' }}</td>
              <td class="p-2 border">{{ o.product }}</td>
              <td class="p-2 border">{{ o.model }}</td>
              <td class="p-2 border">{{ o.size }}</td>
                  <td class="p-2 border">{{ o.color }}</td>
                  <td class="p-2 border">{{ o.quantity }} lusin</td>
                  <td class="p-2 border">{{ o.status }}</td>
                  <td class="p-2 border">Rp {{ o.unit_price ? Number(o.unit_price).toLocaleString('id-ID') : '-' }}</td>
                  <td class="p-2 border">Rp {{ o.total_price ? Number(o.total_price).toLocaleString('id-ID') : '-' }}</td>
                  <td class="p-2 border">{{ o.payment_status || '-' }}</td>
                  <td class="p-2 border">{{ o.order_date ? new Date(o.order_date).toLocaleDateString() : '-' }}</td>
                  <td class="p-2 border">{{ o.deadline ? new Date(o.deadline).toLocaleDateString() : '-' }}</td>
                  <td class="p-2 border">
                    <div v-if="o.sablon_path || o.sablon_url">
                      <img @click="downloadSablon(o.sablon_path || o.sablon_url)" :src="o.sablon_url ? o.sablon_url : getPublicPreview(o.sablon_path)" class="max-w-[80px] cursor-pointer" />
                    </div>
                    <div v-else>-</div>
                  </td>
                  <td class="p-2 border">
                    <button @click="goToDetail(o.id || o.orders_id)" class="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">View</button>
                  </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script>
import OrderCard from '../components/OrderCard.vue'
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, getProfile } from '../lib/supabase'
import { getCurrentUser, getToken, decodeToken, clearToken, getSupabaseAccessToken } from '../lib/auth'
import { apiGet, apiPostFormData, apiPost } from '../lib/api'

export default {
  name: 'Dashboard',
  components: { OrderCard },
  setup() {
    const router = useRouter()
    const orders = ref([])
    const loading = ref(false)
    const isAdmin = ref(false)
    const userId = ref(null)
    const viewMode = ref('list')

  const form = reactive({ product: '', model: '', size: '', color: '', address: '', phone: '', quantity: 1, custom: {}, deadline: '', customer_name: '', order_name: '' })
    const fileRef = ref(null)
    const previewUrl = ref(null)
    const bucketName = 'sablon-images' // make sure this bucket exists in Supabase Storage

    const publicUrlCache = {}

    // Model creation state
    const newModel = ref({ 
      name: '', 
      description: '', 
      size_fields: [],
      unit_price: null
    })
    const modelCreateMsg = ref('')

    // Model options - will be fetched from backend or use fallback
    const modelOptions = ref([])
    const selectedModelId = ref(null)
    
    // Model editing state
    const editingModelId = ref(null)
    const editForm = ref({ name: '', description: '', unit_price: null, size_fields: [] })
    
    // Fallback model options with hardcoded fields (used if backend doesn't have models or size_fields)
    const fallbackModelOptions = [
      { key: 'SetelanAnakPria', label: 'Setelan Anak Pria', fields: [
        { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
        { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
        { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
        { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
      ] },
      { key: 'SetelanAnakWanita', label: 'Setelan Anak Wanita', fields: [
        { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
        { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
        { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
        { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
      ] },
      { key: 'KaosOblongDewasa', label: 'Kaos Oblong Dewasa', fields: [
        { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
        { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
        { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' }
      ] },
      { key: 'JaketHoodie', label: 'Jaket / Hoodie', fields: [
        { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
        { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
        { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' },
        { key: 'ukuran_hoodie', label: 'Ukuran Hoodie', type: 'text', unit: '' }
      ] },
      { key: 'SeragamOlahraga', label: 'Seragam Olahraga', fields: [
        { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
        { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
        { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' }
      ] }
    ]

    // Load models from backend
    async function loadModels() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] === Loading models from backend ===');
      console.log('[Dashboard] Timestamp:', new Date().toISOString());
      
      try {
        // Step 1: Fetch models from API
        console.log('[Dashboard] Step 1: Calling GET /models API');
        const models = await apiGet('/models');
        
        console.log('[Dashboard] ✓ API response received');
        console.log('[Dashboard] Models count:', models ? models.length : 0);
        console.log('[Dashboard] Models type:', typeof models);
        console.log('[Dashboard] Is array:', Array.isArray(models));
        
        // Step 2: Process models
        if (models && models.length > 0) {
          console.log('[Dashboard] Step 2: Processing models...');
          
          // Convert backend models to frontend format and preserve metadata
          modelOptions.value = models.map((m, idx) => {
            console.log(`[Dashboard] Processing model ${idx + 1}:`, {
              models_id: m.models_id,
              name: m.name,
              has_size_fields: !!(m.size_fields && Array.isArray(m.size_fields)),
              size_fields_count: Array.isArray(m.size_fields) ? m.size_fields.length : 0
            });
            
            // If model has size_fields from DB, use them
            if (m.size_fields && Array.isArray(m.size_fields) && m.size_fields.length > 0) {
              console.log(`[Dashboard] Model ${idx + 1} has dynamic size_fields from database:`, m.size_fields.length);
              
              const fields = m.size_fields.map(f => ({
                key: f.key || f.name || '',
                label: f.label || f.name || '',
                type: f.type || 'text',
                unit: f.unit || ''
              }));
              
              console.log(`[Dashboard] Converted fields for model ${idx + 1}:`, fields.map(f => f.key));
              
              return {
                models_id: m.models_id,
                name: m.name || 'Unknown Model',
                description: m.description || '',
                size_fields: m.size_fields || [],
                unit_price: m.unit_price || null,
                // keep old shape for existing template code compatibility
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: fields
              };
            } else {
              // No size_fields, try to match with fallback
              console.log(`[Dashboard] Model ${idx + 1} has no size_fields, checking fallback...`);
              const fallback = fallbackModelOptions.find(fm => fm.key === m.name || fm.label === m.name);
              
              if (fallback) {
                console.log(`[Dashboard] ✓ Found fallback match for "${m.name}":`, fallback.fields.length, 'fields');
              } else {
                console.log(`[Dashboard] ⚠️  No fallback match for "${m.name}", using empty fields`);
              }
              
              return {
                models_id: m.models_id,
                name: m.name || 'Unknown Model',
                description: m.description || '',
                size_fields: Array.isArray(m.size_fields) ? m.size_fields : [],
                unit_price: m.unit_price || null,
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: fallback ? fallback.fields : []
              };
            }
          });
          
          console.log('[Dashboard] ✓ Models converted:', modelOptions.value.length);
          console.log('[Dashboard] Model keys:', modelOptions.value.map(m => m.key));
          console.log('[Dashboard] Models with dynamic fields:', modelOptions.value.filter(m => m.fields.length > 0).length);
        } else {
          console.warn('[Dashboard] ⚠️  No models returned from backend');
          console.warn('[Dashboard] Using fallback hardcoded models');
          modelOptions.value = fallbackModelOptions;
          console.log('[Dashboard] Fallback models count:', modelOptions.value.length);
        }
        
        // Step 3: Initialize form.model
        console.log('[Dashboard] Step 3: Initializing form.model');
        if (!form.model && modelOptions.value.length > 0) {
          form.model = modelOptions.value[0].key;
          console.log('[Dashboard] ✓ Set initial model to:', form.model);
        } else if (form.model) {
          console.log('[Dashboard] form.model already set to:', form.model);
        } else {
          console.error('[Dashboard] ❌ No models available to initialize');
        }
        
        console.log('[Dashboard] === Models loaded successfully ===');
        console.log('[Dashboard] Summary:');
        console.log('[Dashboard]   Total models:', modelOptions.value.length);
        console.log('[Dashboard]   Using dynamic size_fields:', modelOptions.value.filter(m => m.fields.length > 0).length);
        console.log('[Dashboard]   Current selected model:', form.model);
        console.log('[Dashboard] ========================================');
      } catch (err) {
        console.error('[Dashboard] ========================================');
        console.error('[Dashboard] ❌ Failed to load models from backend');
        console.error('[Dashboard] Error name:', err.name);
        console.error('[Dashboard] Error message:', err.message);
        console.error('[Dashboard] Error stack:', err.stack);
        console.error('[Dashboard] Full error:', err);
        console.error('[Dashboard] Using fallback hardcoded models');
        
        modelOptions.value = fallbackModelOptions;
        
        console.error('[Dashboard] Fallback models count:', modelOptions.value.length);
        console.error('[Dashboard] === Model loading failed (using fallback) ===');
        console.error('[Dashboard] ========================================');
      }
      
      // Ensure form.model is initialized to a valid model
      if (!form.model && modelOptions.value.length > 0) {
        form.model = modelOptions.value[0].key;
        console.log('[Dashboard] Final fallback: Set model to:', form.model);
      }
    }

    function getFieldsForModel(key) {
      console.log('[Dashboard] getFieldsForModel called for:', key);
      const m = modelOptions.value.find(x => x.key === key || x.name === key || x.models_id === key);
      
      if (m) {
        console.log('[Dashboard] ✓ Found model:', m.label);
        console.log('[Dashboard] Fields count:', m.fields ? m.fields.length : 0);
        if (m.fields && m.fields.length > 0) {
          console.log('[Dashboard] Field keys:', m.fields.map(f => f.key));
        } else {
          console.log('[Dashboard] ⚠️  No fields for this model');
        }
        return m.fields || [];
      } else {
        console.warn('[Dashboard] ⚠️  Model not found:', key);
        console.warn('[Dashboard] Available models:', modelOptions.value.map(x => x.key));
        return [];
      }
    }

    // helper: find selected model object by id
    function selectedModel() {
      if (!selectedModelId.value) return null
      return modelOptions.value.find(m => m.models_id === selectedModelId.value) || null
    }

    async function load() {
      console.log('[Dashboard] === Loading orders ===');
      loading.value = true
      const payload = getCurrentUser() || decodeToken(getToken())
      if (!payload) {
        console.log('[Dashboard] User not logged in');
        loading.value = false
        return
      }
      console.log('[Dashboard] User payload:', { users_id: payload.users_id, is_admin: payload.is_admin });
      
      // Use users_id from token
      const uid = payload.users_id || null
      if (!uid) {
        console.error('[Dashboard] No users_id in token');
        loading.value = false
        return
      }
      userId.value = uid
      // prefer the is_admin flag from token
      isAdmin.value = !!payload.is_admin
      console.log('[Dashboard] User is_admin:', isAdmin.value);

      try {
        // Allow all authenticated users to fetch all orders (no gatekeeping)
        const endpoint = '/orders';
        console.log('[Dashboard] Fetching orders from', endpoint);
        
        // Use API helper for authenticated request
        let orderData;
        try {
          orderData = await apiGet(endpoint);
        } catch (apiErr) {
          console.error('[Dashboard] API request failed');
          console.error('[Dashboard] Error name:', apiErr.name);
          console.error('[Dashboard] Error message:', apiErr.message);
          
          // Provide user-friendly error messages based on error type
          if (apiErr.message.includes('502')) {
            throw new Error('Server is temporarily unavailable. Please try again in a moment.');
          } else if (apiErr.message.includes('504')) {
            throw new Error('Request timeout. The server took too long to respond.');
          } else if (apiErr.message.includes('Authentication')) {
            throw new Error('Your session has expired. Please log in again.');
          } else {
            throw new Error('Failed to load orders: ' + apiErr.message);
          }
        }
        
        orders.value = orderData || [];
        console.log('[Dashboard] Orders loaded:', orders.value.length);
        
        if (orders.value.length > 0) {
          console.log('[Dashboard] First order sample:', {
            id: orders.value[0].id,
            orders_id: orders.value[0].orders_id,
            product: orders.value[0].product,
            model: orders.value[0].model,
            status: orders.value[0].status,
            payment_status: orders.value[0].payment_status
          });
        } else {
          console.log('[Dashboard] No orders found for user');
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch orders', err)
        console.error('[Dashboard] Error details:', err.message);
        alert(err.message || 'Failed to load orders')
        orders.value = []; // Ensure orders is an empty array on error
      }
      loading.value = false
      console.log('[Dashboard] === Load complete ===');
    }

    function resetForm() {
      form.product = ''
      form.model = ''
      form.size = ''
      form.color = ''
      form.address = ''
      form.phone = ''
      form.quantity = 1
      fileRef.value = null
      previewUrl.value = null
      // clear file input if present in DOM
      const f = document.querySelector('input[type="file"]')
      if (f) f.value = null
    }

    function onFileChange(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) {
        fileRef.value = null
        previewUrl.value = null
        return
      }
      fileRef.value = f
      previewUrl.value = URL.createObjectURL(f)
    }

    async function handleCreate() {
      console.log('[FRONTEND] === Starting order creation ===');
      try {
        if (!userId.value) {
          console.error('[FRONTEND] User not logged in');
          throw new Error('Not logged in');
        }
        console.log('[FRONTEND] User ID:', userId.value);
        
        // require a sablon image
        if (!fileRef.value) {
          console.error('[FRONTEND] No sablon image selected');
          throw new Error('Sablon image is required');
        }
        console.log('[FRONTEND] Sablon file:', { 
          name: fileRef.value.name, 
          type: fileRef.value.type, 
          size: fileRef.value.size 
        });

        // Build form data
        const fd = new FormData()
        fd.append('product', form.product || '')
        fd.append('model', form.model || '')
        fd.append('size', form.size || '')
        fd.append('color', form.color || '')
        fd.append('address', form.address || '')
        fd.append('phone', form.phone || '')
        fd.append('quantity', String(form.quantity || 1))
        const unitPrice = unitPriceForModel(form.model) || 0
        const total = unitPrice * (Number(form.quantity || 1))
        fd.append('unit_price', String(unitPrice))
        fd.append('total_price', String(total))
        fd.append('order_date', new Date().toISOString())
        if (form.deadline) fd.append('deadline', form.deadline)
        if (form.customer_name) fd.append('customer_name', form.customer_name)
        if (form.order_name) fd.append('order_name', form.order_name)
        fd.append('payment_method', 'bank')
        fd.append('custom', JSON.stringify(form.custom || {}))
        if (fileRef.value) fd.append('file', fileRef.value)

        console.log('[FRONTEND] Sending POST /server/orders via apiPostFormData...');
        // Use API helper for authenticated request (handles Authorization)
        const json = await apiPostFormData('/server/orders', fd)
        const created = json.order
        if (created) {
          console.log('[FRONTEND] Order created:', { id: created.id, status: created.status });
          orders.value.unshift(created);
          // preload public url for the newly created order's sablon image
          try { await preloadPublicUrls([created]); } catch (e) { 
            console.warn('[FRONTEND] Failed to preload public URL:', e);
          }
        }
        alert('Order created (server upload)');
        // redirect user to payment page for this order so they can upload proof (SPA navigation)
        if (created && (created.id || created.orders_id)) {
          const orderId = created.id || created.orders_id;
          console.log('[FRONTEND] Redirecting to payment page for order:', orderId);
          try {
            await router.push({ name: 'Payment', query: { order: String(orderId) } });
            console.log('[FRONTEND] Navigation to Payment successful');
            return;
          } catch (e) {
            console.warn('[FRONTEND] router.push to Payment failed:', e.message || e);
            console.warn('[FRONTEND] Falling back to list view');
          }
        } else {
          console.warn('[FRONTEND] No valid order ID for navigation, staying on list view');
        }
        viewMode.value = 'list';
        // reset UI
        resetForm();
        console.log('[FRONTEND] === Order creation complete ===');
      } catch (err) {
        console.error('[FRONTEND] === Order creation failed ===');
        console.error('[FRONTEND] Error:', err);
        console.error('[FRONTEND] Error message:', err.message);
        console.error('[FRONTEND] Error stack:', err.stack);
        alert(err.message || String(err));
      }
    }

  function goToDetail(id) { 
    console.log('[goToDetail] Navigating to order detail:', id);
    if (!id) {
      console.error('[goToDetail] No order ID provided');
      return;
    }
    try { 
      router.push({ name: 'OrderDetail', params: { id: String(id) } }) 
    } catch (e) { 
      console.error('[goToDetail] router.push failed', e);
    } 
  }
  
  function goToHistory(id) { 
    console.log('[goToHistory] Navigating to order history:', id);
    if (!id) {
      console.error('[goToHistory] No order ID provided');
      return;
    }
    try { 
      router.push({ name: 'OrderHistory', params: { id: String(id) } }) 
    } catch (e) { 
      console.error('[goToHistory] router.push failed', e);
    } 
  }
  
  function goToOrderStatusHistory() {
    console.log('[goToOrderStatusHistory] Navigating to centralized order status history dashboard');
    try {
      router.push({ name: 'OrderStatusHistory' })
    } catch (e) {
      console.error('[goToOrderStatusHistory] router.push failed', e);
    }
  }
  
    function trackOrder(id) { alert('Track order ' + id) }

    async function getPublicPreview(path) {
      if (!path) return null
      if (publicUrlCache[path]) return publicUrlCache[path]
      try {
        // Prefer using Supabase Storage public URL when client is available
        if (supabase && bucketName) {
          try {
            const { data, error } = await supabase.storage.from(bucketName).getPublicUrl(path)
            if (!error && data && data.publicUrl) {
              publicUrlCache[path] = data.publicUrl
              return data.publicUrl
            }
          } catch (e) {
            // continue to fallback below
          }
        }

        // Fallback to building a URL from VITE_API_URL (if provided)
        if (import.meta.env.VITE_API_URL) {
          const url = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${path}`
          publicUrlCache[path] = url
          return url
        }

        return null
      } catch (err) {
        console.warn('[getPublicPreview] fallback for', path, err)
        return null
      }
    }

    function unitPriceForModel(modelName) {
      // Try to find the model in modelOptions by name
      const model = modelOptions.value.find(m => m.name === modelName);
      if (model && model.unit_price) {
        return Number(model.unit_price);
      }
      
      // Fallback to hardcoded prices for backward compatibility
      const priceMap = {
        SetelanAnakPria: 32000,
        SetelanAnakWanita: 30000,
        KaosOblongDewasa: 28000,
        JaketHoodie: 29000,
        SeragamOlahraga: 31000
      }
      return priceMap[modelName] || 0
    }

    function totalPrice() {
      const qty = Number(form.quantity || 0)
      return unitPriceForModel(form.model) * qty
    }

    function formatNumber(n) {
      try { return Number(n).toLocaleString('id-ID') } catch (e) { return String(n) }
    }

    // helper used in template (sync) — returns cached public url or placeholder
    function getPublicPreviewSync(path) {
      return publicUrlCache[path] || ''
    }

    // download sablon: will open in new tab or download blob
    async function downloadSablon(pathOrUrl) {
      try {
        if (!pathOrUrl) return
        // if it's already a full URL, open it directly
        if (typeof pathOrUrl === 'string' && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://'))) {
          window.open(pathOrUrl, '_blank')
          return
        }
        const path = pathOrUrl
        // Prefer Supabase public URL if possible
        if (supabase && bucketName) {
          try {
            const { data, error } = await supabase.storage.from(bucketName).getPublicUrl(path)
            if (!error && data && data.publicUrl) {
              window.open(data.publicUrl, '_blank')
              return
            }
          } catch (e) {
            // ignore and fallback below
          }
        }

        // Fallback to VITE_API_URL-based URL
        const pubUrl = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${path}`
        window.open(pubUrl, '_blank')
      } catch (err) {
        console.error('[downloadSablon] error', err)
        alert('Failed to download image: ' + (err.message || err))
      }
    }

    async function logout() {
      clearToken()
      try { await router.push({ name: 'Home' }) } catch (e) { console.warn('[logout] router.push failed', e) }
    }

    // Model management functions
    function addSizeField() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] addSizeField called');
      console.log('[Dashboard] Current size_fields count:', newModel.value.size_fields.length);
      
      const newField = {
        key: '',
        label: '',
        type: 'number',
        unit: 'cm'
      };
      
      newModel.value.size_fields.push(newField);
      
      console.log('[Dashboard] New size_fields count:', newModel.value.size_fields.length);
      console.log('[Dashboard] Added field:', newField);
      console.log('[Dashboard] ========================================');
    }

    function removeSizeField(index) {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] removeSizeField called');
      console.log('[Dashboard] Removing field at index:', index);
      console.log('[Dashboard] Current size_fields count:', newModel.value.size_fields.length);
      
      if (index >= 0 && index < newModel.value.size_fields.length) {
        const removed = newModel.value.size_fields[index];
        console.log('[Dashboard] Field being removed:', removed);
        newModel.value.size_fields.splice(index, 1);
        console.log('[Dashboard] ✓ Field removed successfully');
      } else {
        console.error('[Dashboard] ❌ Invalid index:', index);
      }
      
      console.log('[Dashboard] New size_fields count:', newModel.value.size_fields.length);
      console.log('[Dashboard] ========================================');
    }

    // Edit-form size field helpers
    function addEditSizeField() {
      console.log('[Dashboard] addEditSizeField called');
      if (!editForm.value || !Array.isArray(editForm.value.size_fields)) editForm.value.size_fields = [];
      editForm.value.size_fields.push({ key: '', label: '', type: 'number', unit: 'cm' });
    }

    function removeEditSizeField(index) {
      console.log('[Dashboard] removeEditSizeField called', index);
      if (!editForm.value || !Array.isArray(editForm.value.size_fields)) return;
      if (index >= 0 && index < editForm.value.size_fields.length) {
        editForm.value.size_fields.splice(index, 1);
      }
    }

    // Called when selecting a model from dropdown
    function onModelSelect() {
      const sel = selectedModel();
      console.log('[Dashboard] onModelSelect:', sel ? sel.name : 'null');
      if (!sel) {
        editForm.value = { name: '', description: '', unit_price: null, size_fields: [] };
        editingModelId.value = null;
        return;
      }
      editingModelId.value = sel.models_id;
      editForm.value = {
        name: sel.name || '',
        description: sel.description || '',
        unit_price: sel.unit_price || null,
        size_fields: Array.isArray(sel.size_fields) ? JSON.parse(JSON.stringify(sel.size_fields)) : []
      };
    }

    // Delete selected model (uses same flow as deleteModel but for selected)
    async function deleteSelectedModel() {
      const sel = selectedModel();
      if (!sel) return alert('No model selected');
      if (!confirm(`Are you sure you want to delete the model "${sel.name}"? This cannot be undone.`)) return;
      try {
        const token = getToken();
        const response = await fetch(`/api/models/${sel.models_id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (response.status === 409) return alert(err.error || 'Cannot delete model that is referenced by existing orders.');
          throw new Error(err.error || `Delete failed: ${response.status}`);
        }
        await loadModels();
        selectedModelId.value = null;
        editForm.value = { name: '', description: '', unit_price: null, size_fields: [] };
        alert('Model deleted successfully');
      } catch (e) {
        console.error('[Dashboard] deleteSelectedModel failed', e);
        alert('Failed to delete model: ' + (e.message || e));
      }
    }

    async function createModel() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] === Creating new model ===');
      console.log('[Dashboard] Timestamp:', new Date().toISOString());
      console.log('[Dashboard] Current model data:', JSON.stringify(newModel.value, null, 2));
      
      try {
        // Step 1: Validate model name
        console.log('[Dashboard] Step 1: Validating model name');
        if (!newModel.value.name || !newModel.value.name.trim()) {
          console.error('[Dashboard] ❌ Model name is required');
          modelCreateMsg.value = 'Model name is required'
          return
        }
        console.log('[Dashboard] ✓ Model name valid:', newModel.value.name);

        // Step 2: Validate and filter size fields
        console.log('[Dashboard] Step 2: Validating size fields');
        console.log('[Dashboard] Total size fields:', newModel.value.size_fields.length);
        
        const sizeFields = newModel.value.size_fields.filter(f => {
          const isValid = !!(f.key && f.label);
          console.log('[Dashboard] Field validation:', {
            key: f.key || '(empty)',
            label: f.label || '(empty)',
            type: f.type,
            unit: f.unit,
            isValid
          });
          return isValid;
        });
        
        console.log('[Dashboard] Valid size fields:', sizeFields.length);
        
        // Warn if some fields are incomplete
        if (sizeFields.length < newModel.value.size_fields.length) {
          const incomplete = newModel.value.size_fields.length - sizeFields.length;
          console.warn(`[Dashboard] ⚠️  ${incomplete} incomplete fields will be removed`);
        }

        // Step 3: Prepare payload
        console.log('[Dashboard] Step 3: Preparing API payload');
        const payload = { 
          name: newModel.value.name.trim(), 
          description: newModel.value.description.trim() || null
        };
        
        // Only include size_fields if there are valid fields
        if (sizeFields.length > 0) {
          payload.size_fields = sizeFields;
          console.log('[Dashboard] Including size_fields in payload:', sizeFields.length);
        } else {
          console.log('[Dashboard] No valid size_fields to include');
        }
        
        // Include unit_price if provided
        if (newModel.value.unit_price !== null && newModel.value.unit_price !== '' && newModel.value.unit_price !== undefined) {
          payload.unit_price = Number(newModel.value.unit_price);
          console.log('[Dashboard] Including unit_price in payload:', payload.unit_price);
        } else {
          console.log('[Dashboard] No unit_price provided');
        }
        
        console.log('[Dashboard] Payload prepared:', JSON.stringify(payload, null, 2));

        // Step 4: Send API request
        console.log('[Dashboard] Step 4: Sending POST /models request');
        const created = await apiPost('/models', payload);
        
        console.log('[Dashboard] ✓ Model created successfully!');
        console.log('[Dashboard] Created model:', JSON.stringify(created, null, 2));
        
        // Step 5: Update UI
        console.log('[Dashboard] Step 5: Updating UI');
        modelCreateMsg.value = `✓ Model "${newModel.value.name}" created successfully with ${sizeFields.length} size fields!`;
        console.log('[Dashboard] Success message set:', modelCreateMsg.value);
        
        // Step 6: Reload models to update dropdown
        console.log('[Dashboard] Step 6: Reloading models list');
        await loadModels();
        
        // Step 7: Auto-close and refresh
        console.log('[Dashboard] Step 7: Scheduling auto-close (2 seconds)');
        setTimeout(() => {
          console.log('[Dashboard] Auto-close timeout triggered');
          newModel.value = { name: '', description: '', size_fields: [], unit_price: null };
          viewMode.value = 'list';
          modelCreateMsg.value = '';
          console.log('[Dashboard] Form reset and closed');
        }, 2000);
        
        console.log('[Dashboard] === Model creation complete ===');
        console.log('[Dashboard] ========================================');
      } catch (err) {
        console.error('[Dashboard] ========================================');
        console.error('[Dashboard] ❌ Model creation failed');
        console.error('[Dashboard] Error name:', err.name);
        console.error('[Dashboard] Error message:', err.message);
        console.error('[Dashboard] Error stack:', err.stack);
        console.error('[Dashboard] Full error:', err);
        
        modelCreateMsg.value = '❌ Failed to create model: ' + (err.message || err);
        console.error('[Dashboard] Error message set:', modelCreateMsg.value);
        console.error('[Dashboard] === Model creation failed ===');
        console.error('[Dashboard] ========================================');
      }
    }

    // Start editing a model (legacy support)
    function startEditModel(model) {
      console.log('[Dashboard] Starting model edit:', model.name);
      selectedModelId.value = model.models_id;
      editingModelId.value = model.models_id;
      editForm.value = {
        name: model.name || '',
        description: model.description || '',
        unit_price: model.unit_price || null,
        size_fields: Array.isArray(model.size_fields) ? JSON.parse(JSON.stringify(model.size_fields)) : []
      };
    }

    // Cancel model editing
    function cancelEditModel() {
      console.log('[Dashboard] Cancelling model edit');
      editingModelId.value = null;
      editForm.value = { name: '', description: '', unit_price: null, size_fields: [] };
    }

    // Save edited model
    async function saveEditModel() {
      console.log('[Dashboard] === Saving model edits ===');
      try {
        const modelId = selectedModelId.value || editingModelId.value;
        if (!modelId) {
          throw new Error('No model selected for editing');
        }

        console.log('[Dashboard] Preparing update payload');
        const payload = {};

        if (editForm.value.name && editForm.value.name.trim()) {
          payload.name = editForm.value.name.trim();
        }

        if (editForm.value.description !== undefined) {
          payload.description = editForm.value.description?.trim() || null;
        }

        if (editForm.value.unit_price !== undefined && editForm.value.unit_price !== null && editForm.value.unit_price !== '') {
          payload.unit_price = Number(editForm.value.unit_price);
        }

        if (editForm.value.size_fields !== undefined) {
          // send size_fields as array (may be empty)
          payload.size_fields = Array.isArray(editForm.value.size_fields) ? editForm.value.size_fields : [];
        }

        console.log('[Dashboard] Update payload:', payload);

        if (Object.keys(payload).length === 0) {
          throw new Error('No changes to save');
        }

        console.log('[Dashboard] Sending PATCH /models/:id request');
        const token = getToken();
        const response = await fetch(`/api/models/${modelId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Update failed: ${response.status}`);
        }

        const updated = await response.json();
        console.log('[Dashboard] ✓ Model updated successfully:', updated);

        // Reload models
        await loadModels();

        // Clear edit state
        editingModelId.value = null;
        editForm.value = { name: '', description: '', unit_price: null, size_fields: [] };

        alert('Model updated successfully!');
      } catch (err) {
        console.error('[Dashboard] ❌ Failed to update model:', err);
        alert('Failed to update model: ' + (err.message || err));
      }
    }

    // Delete a model
    async function deleteModel(model) {
      console.log('[Dashboard] === Deleting model ===');
      console.log('[Dashboard] Model:', model.name);

      if (!confirm(`Are you sure you want to delete the model "${model.name}"?\n\nThis action cannot be undone. If this model is used by existing orders, the deletion will be prevented.`)) {
        console.log('[Dashboard] Delete cancelled by user');
        return;
      }

      try {
        console.log('[Dashboard] Sending DELETE /models/:id request');
        const token = getToken();
        const response = await fetch(`/api/models/${model.models_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          
          // Handle foreign key constraint
          if (response.status === 409) {
            console.warn('[Dashboard] ⚠️  Cannot delete: Model is referenced by orders');
            alert(error.error || 'Cannot delete model that is referenced by existing orders.\n\nConsider archiving instead.');
            return;
          }
          
          throw new Error(error.error || `Delete failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[Dashboard] ✓ Model deleted successfully:', result);

        // Reload models
        await loadModels();

        alert('Model deleted successfully!');
      } catch (err) {
        console.error('[Dashboard] ❌ Failed to delete model:', err);
        alert('Failed to delete model: ' + (err.message || err));
      }
    }

    // small initialization: preload public urls for existing orders
    async function preloadPublicUrls(list) {
      for (const o of list) {
        if (o.sablon_path) {
          try {
            if (o.sablon_url) {
              publicUrlCache[o.sablon_path] = o.sablon_url || ''
              continue
            }
            const { data } = await supabase.storage.from(bucketName).getPublicUrl(o.sablon_path)
            publicUrlCache[o.sablon_path] = data?.publicUrl || ''
          } catch (e) { /* ignore */ }
        }
      }
    }

    onMounted(async () => {
      await loadModels()
      await load()
      await preloadPublicUrls(orders.value)
    })

    // template needs a sync getter for preview src — use computed-style helper
    return {
      orders,
      loading,
      isAdmin,
      goToDetail,
      goToHistory,
      goToOrderStatusHistory,
      trackOrder,
      handleCreate,
      createOrder: handleCreate,
      viewMode,
      form,
      onFileChange,
      resetForm,
      previewUrl,
      downloadSablon,
      getPublicPreview: getPublicPreviewSync,
      modelOptions,
      getFieldsForModel,
      unitPriceForModel,
      totalPrice,
      formatNumber,
      logout,
      newModel,
      modelCreateMsg,
      addSizeField,
      removeSizeField,
      createModel,
      editingModelId,
      editForm,
      selectedModelId,
      onModelSelect,
      selectedModel,
      addEditSizeField,
      removeEditSizeField,
      startEditModel,
      cancelEditModel,
      saveEditModel,
      deleteModel,
      deleteSelectedModel
    }
  }
}
</script>

<style scoped>
.dashboard { padding: 1rem }
</style>
```

### File: src/views/OrderDetail.vue

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/views/OrderDetail.vue

```vue
<template>
  <section class="container py-6">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 class="text-xl font-bold mb-4">Order Detail — #{{ id }}</h2>

      <div v-if="loading">Loading…</div>
      <div v-else-if="!order">Order not found.</div>
      <div v-else>
        <div class="mb-3"><strong>Product:</strong> {{ order.product || '-' }}</div>
        <div class="mb-3"><strong>Model / Size / Color:</strong> {{ order.model || '-' }} / {{ order.size || '-' }} / {{ order.color || '-' }}</div>

        <!-- dynamic model-specific custom fields -->
        <div v-if="modelFields.length" class="mb-3">
          <strong>Measurements / Options for {{ order.model }}:</strong>
          <div class="mt-2 space-y-2">
            <div v-for="f in modelFields" :key="f.key" class="text-sm">
              <span class="font-medium">{{ f.label }}:</span>
              <span class="ml-2">{{ displayCustomValue(f) }}</span>
              <span v-if="f.unit" class="ml-1 text-gray-600">{{ f.unit }}</span>
            </div>
          </div>
        </div>
        <div class="mb-3"><strong>Quantity:</strong> {{ order.quantity || '-' }}</div>
        <div class="mb-3"><strong>Unit price:</strong> {{ formatMoney(order.unit_price) }}</div>
        <div class="mb-3"><strong>Total price:</strong> {{ formatMoney(order.total_price || order.total) }}</div>
        <div class="mb-3"><strong>Order date:</strong> {{ formatDate(order.order_date) }}</div>
        <div class="mb-3"><strong>Deadline:</strong> {{ order.deadline || '-' }}</div>
        <div class="mb-3"><strong>Payment status:</strong> <span :class="paymentClass">{{ order.payment_status || 'not submitted' }}</span></div>
        <div v-if="order.payment_proof_url || order.payment_proof_path" class="mb-3">
          <strong>Payment proof:</strong>
          <div class="mt-2">
            <a :href="order.payment_proof_url || order.payment_proof_path" target="_blank" class="text-blue-600 underline">Open proof image</a>
          </div>
        </div>
        <div class="mt-4">
          <router-link class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" to="/dashboard">Back to Dashboard</router-link>
        </div>

        <!-- Status update form (available to any authenticated user) -->
        <div class="mt-6 p-4 border rounded bg-gray-50">
          <h3 class="font-semibold mb-2">Update Order Status</h3>
          <div class="mb-2">
            <label class="block text-sm font-medium">New status</label>
            <select v-model="newStatus" class="mt-1 block w-full border rounded p-2">
              <option value="created">created</option>
              <option value="confirmed">confirmed</option>
              <option value="printing">printing</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-sm font-medium">Payment status (optional)</label>
            <select v-model="newPaymentStatus" class="mt-1 block w-full border rounded p-2">
              <option value="">(no change)</option>
              <option value="pending">pending</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-sm font-medium">Note (optional)</label>
            <input v-model="note" class="mt-1 block w-full border rounded p-2" type="text" />
          </div>

          <div class="mb-4">
            <label class="inline-flex items-center">
              <input type="checkbox" v-model="force" class="mr-2" />
              <span class="text-sm">Force transition (skip validation)</span>
            </label>
          </div>

          <div class="flex space-x-2">
            <button @click="submitStatus" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update Status</button>
            <button @click="reloadOrder" class="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400">Reload</button>
          </div>
        </div>

        <!-- Delete Order Section -->
        <div class="mt-6 p-4 border border-red-300 rounded bg-red-50">
          <h3 class="font-semibold mb-2 text-red-700">Danger Zone</h3>
          <p class="text-sm text-gray-700 mb-3">Once you delete an order, there is no going back. Please be certain.</p>
          <button @click="deleteOrder" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete Order</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet, apiPut } from '../lib/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const order = ref(null)
const loading = ref(true)

console.log('[OrderDetail] Component mounted, order ID:', id);

function formatMoney(v) {
  try {
    return v ? Number(v).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'
  } catch (e) { return String(v || '-') }
}

function formatDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleString() } catch (e) { return String(d) }
}

const paymentClass = computed(() => {
  const s = order.value?.payment_status
  if (s === 'paid') return 'text-green-600 font-semibold'
  if (s === 'pending') return 'text-yellow-600 font-semibold'
  if (s === 'failed' || s === 'cancelled') return 'text-red-600 font-semibold'
  return 'text-gray-700'
})

// model options and fields mapping (same as Dashboard)
const modelOptions = [
  { key: 'SetelanAnakPria', label: 'Setelan Anak Pria', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
    { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
  ] },
  { key: 'SetelanAnakWanita', label: 'Setelan Anak Wanita', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
    { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
  ] },
  { key: 'KaosOblongDewasa', label: 'Kaos Oblong Dewasa', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' }
  ] },
  { key: 'JaketHoodie', label: 'Jaket / Hoodie', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' },
    { key: 'ukuran_hoodie', label: 'Ukuran Hoodie', type: 'text', unit: '' }
  ] },
  { key: 'SeragamOlahraga', label: 'Seragam Olahraga', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' }
  ] }
]

const modelFields = computed(() => {
  const key = order.value?.model
  if (!key) return []
  const m = modelOptions.find(x => x.key === key)
  return m ? m.fields : []
})

function displayCustomValue(field) {
  try {
    let v = order.value?.custom ? order.value.custom[field.key] : undefined
    // sometimes `custom` may be stored as a JSON string; try to parse
    if (typeof v === 'string') {
      const s = v.trim()
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try { v = JSON.parse(s) } catch (e) { /* keep string if parse fails */ }
      }
    }
    if (v === undefined || v === null || v === '') return '-'
    return field.type === 'number' ? String(v) : String(v)
  } catch (e) { return '-' }
}

async function loadOrder() {
  loading.value = true
  try {
    // Use API helper for authenticated request
    const data = await apiGet(`/orders/${id}`)
    order.value = data
    console.log('[orderDetail] loaded order', order.value?.id, 'historyCount=', order.value?.history?.length || 0)
  } catch (e) {
    console.error('[orderDetail] load error', e)
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => loadOrder())

// status update state
const newStatus = ref('')
const newPaymentStatus = ref('')
const note = ref('')
const force = ref(false)

async function submitStatus() {
  console.log('[OrderDetail] === Submitting status update ===');
  console.log('[OrderDetail] Timestamp:', new Date().toISOString());
  console.log('[OrderDetail] Order ID:', id);
  console.log('[OrderDetail] New status:', newStatus.value);
  console.log('[OrderDetail] Payment status:', newPaymentStatus.value || '(not changing)');
  console.log('[OrderDetail] Note:', note.value || '(none)');
  console.log('[OrderDetail] Force:', force.value);
  
  try {
    if (!newStatus.value) {
      console.error('[OrderDetail] No status selected');
      return alert('Please select a new status');
    }
    
    const payload = {
      status: newStatus.value,
      note: note.value || null,
      expected_current_status: order.value?.status || null,
      force: !!force.value
    }
    if (newPaymentStatus.value) payload.payment_status = newPaymentStatus.value
    
    console.log('[OrderDetail] Payload:', payload);
    console.log('[OrderDetail] Calling API PUT /server/orders/:id/status');
    
    // call API helper
    await apiPut(`/server/orders/${id}/status`, payload)
    
    console.log('[OrderDetail] ✓ Status update successful');
    alert('Order status updated')
    
    console.log('[OrderDetail] Reloading order data...');
    await loadOrder()
    
    // reset inputs
    newStatus.value = ''
    newPaymentStatus.value = ''
    note.value = ''
    force.value = false
    
    console.log('[OrderDetail] === Status update complete ===');
  } catch (e) {
    console.error('[OrderDetail] === Status update failed ===');
    console.error('[OrderDetail] Error:', e);
    console.error('[OrderDetail] Error message:', e.message);
    alert('Failed to update status: ' + (e.message || e))
  }
}

async function reloadOrder() {
  console.log('[OrderDetail] Reloading order...');
  await loadOrder()
}

async function deleteOrder() {
  console.log('[OrderDetail] === Attempting to delete order ===');
  console.log('[OrderDetail] Timestamp:', new Date().toISOString());
  console.log('[OrderDetail] Order ID:', id);
  
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    console.log('[OrderDetail] Delete cancelled by user');
    return;
  }
  
  try {
    console.log('[OrderDetail] Calling API DELETE /server/orders/:id');
    const response = await fetch(`/api/server/orders/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[OrderDetail] Delete response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[OrderDetail] Delete failed:', error);
      throw new Error(error.error || `Delete failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[OrderDetail] ✓ Order deleted successfully:', result);
    
    alert('Order deleted successfully');
    console.log('[OrderDetail] Navigating to dashboard...');
    router.push({ name: 'Dashboard' });
    console.log('[OrderDetail] === Delete complete ===');
  } catch (e) {
    console.error('[OrderDetail] === Delete failed ===');
    console.error('[OrderDetail] Error:', e);
    console.error('[OrderDetail] Error message:', e.message);
    alert('Failed to delete order: ' + (e.message || e));
  }
}
</script>
```

### File: src/views/OrderStatusHistory.vue

**Repository:** ingreedzz/website_tracking  
**Branch/Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35  
**Permalink:** https://github.com/ingreedzz/website_tracking/blob/2f3e4302eff3ba07002ca688c38d69bd40c00c35/src/views/OrderStatusHistory.vue

```vue
<template>
  <section class="container py-6">
    <div class="max-w-7xl mx-auto bg-white p-6 rounded shadow">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Order Status History Dashboard</h2>
        <button @click="goBack" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
      </div>

      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-600">Loading history...</div>
      </div>
      
      <div v-else-if="error" class="text-center py-8">
        <div class="text-red-600">{{ error }}</div>
      </div>
      
      <div v-else>
        <!-- Summary Stats -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="p-4 border rounded bg-blue-50">
            <div class="text-2xl font-bold text-blue-700">{{ historyRecords.length }}</div>
            <div class="text-sm text-gray-600">Total Changes</div>
          </div>
          <div class="p-4 border rounded bg-green-50">
            <div class="text-2xl font-bold text-green-700">{{ uniqueOrders }}</div>
            <div class="text-sm text-gray-600">Orders Modified</div>
          </div>
          <div class="p-4 border rounded bg-purple-50">
            <div class="text-2xl font-bold text-purple-700">{{ uniqueUsers }}</div>
            <div class="text-sm text-gray-600">Users Involved</div>
          </div>
          <div class="p-4 border rounded bg-orange-50">
            <div class="text-2xl font-bold text-orange-700">{{ todayChanges }}</div>
            <div class="text-sm text-gray-600">Changes Today</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="mb-4 flex space-x-4">
          <div class="flex-1">
            <input v-model="searchQuery" placeholder="Search by customer, product, order name..." class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <button @click="reloadHistory" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Reload
            </button>
          </div>
        </div>

        <!-- History Table -->
        <div v-if="filteredHistory.length === 0" class="text-center py-8 text-gray-500">
          No history records found.
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-2 border">Date/Time</th>
                <th class="p-2 border">Order Name</th>
                <th class="p-2 border">Customer</th>
                <th class="p-2 border">Product</th>
                <th class="p-2 border">Status Change</th>
                <th class="p-2 border">Changed By</th>
                <th class="p-2 border">Payment Status</th>
                <th class="p-2 border">Note</th>
                <th class="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in filteredHistory" :key="h.order_status_history_id" class="hover:bg-gray-50">
                <td class="p-2 border text-sm">{{ formatDateTime(h.created_at) }}</td>
                <td class="p-2 border">{{ h.order_name || '-' }}</td>
                <td class="p-2 border">{{ h.customer_name || '-' }}</td>
                <td class="p-2 border">{{ h.product || '-' }}</td>
                <td class="p-2 border">
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 rounded text-xs bg-red-100 text-red-700">{{ h.old_status || 'initial' }}</span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                    <span class="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{{ h.new_status }}</span>
                  </div>
                </td>
                <td class="p-2 border text-sm">
                  <div>{{ h.changed_by_name || 'Unknown' }}</div>
                  <div class="text-xs text-gray-500">{{ h.changed_by_email || '-' }}</div>
                </td>
                <td class="p-2 border text-sm">{{ h.payment_status || '-' }}</td>
                <td class="p-2 border text-sm">{{ h.note || '-' }}</td>
                <td class="p-2 border">
                  <button @click="viewOrderDetail(h.order_id)" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                    View Order
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet } from '../lib/api'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const historyRecords = ref([])
const searchQuery = ref('')

const loadHistory = async () => {
  loading.value = true
  error.value = null
  console.log('[OrderStatusHistory] Loading all order status history...')
  
  try {
    const data = await apiGet('/order-status-history')
    console.log('[OrderStatusHistory] Received history records:', data?.length || 0)
    historyRecords.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[OrderStatusHistory] Failed to load history:', err)
    error.value = 'Failed to load order status history. Please try again.'
    historyRecords.value = []
  } finally {
    loading.value = false
  }
}

const reloadHistory = () => {
  loadHistory()
}

const goBack = () => {
  router.push('/dashboard')
}

const viewOrderDetail = (orderId) => {
  if (orderId) {
    router.push(`/order/${orderId}`)
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Computed properties for statistics
const uniqueOrders = computed(() => {
  const orderIds = new Set(historyRecords.value.map(h => h.order_id))
  return orderIds.size
})

const uniqueUsers = computed(() => {
  const users = new Set(historyRecords.value.map(h => h.changed_by_email || h.changed_by_name || h.changed_by).filter(Boolean))
  return users.size
})

const todayChanges = computed(() => {
  const today = new Date().toDateString()
  return historyRecords.value.filter(h => {
    if (!h.created_at) return false
    return new Date(h.created_at).toDateString() === today
  }).length
})

const filteredHistory = computed(() => {
  if (!searchQuery.value) return historyRecords.value
  
  const query = searchQuery.value.toLowerCase()
  return historyRecords.value.filter(h => {
    return (
      (h.customer_name && h.customer_name.toLowerCase().includes(query)) ||
      (h.product && h.product.toLowerCase().includes(query)) ||
      (h.order_name && h.order_name.toLowerCase().includes(query)) ||
      (h.changed_by_name && h.changed_by_name.toLowerCase().includes(query)) ||
      (h.changed_by_email && h.changed_by_email.toLowerCase().includes(query)) ||
      (h.note && h.note.toLowerCase().includes(query))
    )
  })
})

onMounted(() => {
  loadHistory()
})
</script>
```

---

## Notes & Next Steps

### Recommended Actions for Production Readiness

1. **Convert to DOCX**: This Markdown file can be converted to Microsoft Word format (.docx) using Pandoc:
   ```bash
   pandoc docs/memory_of_website.md -o thesis/memory_of_website.docx
   ```
   This makes it easier to share with non-technical stakeholders or include in thesis documentation.

2. **Add Entity-Relationship Diagram (ERD)**: Create a visual ERD showing relationships between `users`, `models`, `orders`, `order_items`, `payments`, and `order_status_history` tables. Tools like dbdiagram.io, Lucidchart, or PlantUML can generate professional diagrams. Save to `thesis/img/erd.png` and reference in thesis.

3. **Add Rate-Limiting Middleware**: Protect API endpoints from abuse by adding rate-limiting (e.g., `express-rate-limit` package). Apply stricter limits to expensive operations like `/order-status-history` and file uploads.

4. **Implement Structured Logging**: Replace console.log statements with a structured logging library like Winston or Pino. Configure log levels (debug, info, warn, error), add PII masking for sensitive fields (email, names), and integrate with log aggregation services (e.g., Logtail, Datadog, Sentry) for production monitoring.

5. **Add Unit and Integration Tests**: While smoke tests exist, add formal test suites using Jest or Mocha for unit tests (individual functions, model validation) and Supertest for integration tests (API endpoint behavior). Aim for >80% code coverage on critical paths (auth, order creation, status updates).

6. **Security Hardening**:
   - Add helmet.js middleware for HTTP security headers.
   - Validate and sanitize all inputs (use express-validator or joi).
   - Implement CSRF protection for state-changing operations.
   - Review and address CodeQL findings in `SECURITY_SUMMARY.md`.

7. **Performance Optimization**:
   - Add database indexes on frequently queried columns (`orders.user_id`, `order_status_history.order_id`, `order_status_history.created_at`).
   - Implement pagination for `/api/orders` and `/api/order-status-history` to handle large datasets.
   - Consider caching frequently accessed models using Redis or in-memory cache.

8. **Documentation Enhancements**:
   - Generate API documentation using Swagger/OpenAPI from route definitions.
   - Add architecture diagrams (component diagram, sequence diagrams for key flows).
   - Create admin guides with screenshots.

### How I Can Help Further

- **Convert this document to DOCX** and place in `thesis/` directory.
- **Generate ERD** from database schema and save to `thesis/img/`.
- **Create diagrams** (architecture, deployment, sequence) for thesis inclusion.
- **Run smoke tests** locally (if dev credentials provided) and attach sample logs/outputs.
- **Implement any of the above recommendations** (rate-limiting, tests, structured logging).
- **Review and expand** any section of this document based on additional requirements.

---

**Document Generated:** 2025-11-15  
**Repository:** https://github.com/ingreedzz/website_tracking  
**Reference Commit:** 2f3e4302eff3ba07002ca688c38d69bd40c00c35
