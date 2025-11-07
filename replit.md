# Chiangho Tracking Order - Replit Project

## Overview
This is a Vue 3 + Express.js order tracking system for Chiangho Sablon Printing Service. The application allows users to track their printing orders with real-time updates.

**Current State:** Fully configured and running in Replit environment

## Tech Stack
- **Frontend:** Vue 3 + Vite + Tailwind CSS
- **Backend:** Express.js + Node.js
- **Database:** Supabase (PostgreSQL) + Optional MySQL fallback
- **Authentication:** JWT-based authentication

## Project Structure
```
/
├── backend/               # Express backend
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   ├── utils/            # Helper utilities
│   ├── server.js         # Main server entry
│   ├── db.js             # MySQL connection (optional)
│   └── supabaseClient.js # Supabase client
├── src/                  # Vue frontend
│   ├── components/       # Vue components
│   ├── views/            # Page views
│   ├── router/           # Vue Router config
│   └── main.js           # Frontend entry
├── public/               # Static assets
└── image/                # Image assets

```

## Environment Configuration
The application uses Supabase as the primary database. Environment variables are configured via Replit Secrets:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase service role key
- `VITE_SUPABASE_URL` - Frontend Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Frontend Supabase anon key
- `JWT_SECRET` - JWT signing secret
- Optional MySQL variables (DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME)

## Replit Configuration

### Workflows
1. **frontend** - Vite dev server on port 5000 (user-facing)
   - Command: `npm run dev`
   - Host: 0.0.0.0:5000
   - Output: webview

2. **backend** - Express API server on port 3000
   - Command: `node backend/server.js`
   - Host: localhost:3000
   - Output: console

### Deployment
- Target: Autoscale (stateless web application)
- Run command: Backend and frontend run together
- No build step required (Vite handles HMR in dev)

## Recent Changes (Nov 7, 2025)
- Imported from GitHub repository
- Configured Vite to run on 0.0.0.0:5000 for Replit compatibility
- Updated database connection to gracefully handle MySQL unavailability
- Set up dual workflow system (frontend + backend)
- Configured deployment for autoscale
- Added proper error handling for database connections

## Database Notes
The application is configured to use Supabase as the primary database. MySQL support is optional and the application will gracefully fall back to Supabase if MySQL is unavailable.

**Supabase Tables Expected:**
- `users` - User accounts with authentication
- `orders` - Order tracking data

Note: If you see API errors related to missing columns (e.g., "user_id vs users_id"), check your Supabase schema to ensure column names match the application code.

## Development
- Frontend runs on http://localhost:5000 (proxied by Replit)
- Backend API available at http://localhost:3000/api
- Frontend proxies `/api` requests to backend automatically

## API Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/users` - List all users
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get specific order details
