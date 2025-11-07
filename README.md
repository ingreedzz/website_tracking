# Skripsi Website (Vue + Vite)

Minimal starter for a skripsi website built with Vue 3 and Vite.

## Local Development

1. Ensure Node.js (v18+) and npm are installed
2. Install dependencies and start the development servers:

```bash
npm install
npm run dev    # Frontend development server
npm start      # Backend server
```

## Deployment Instructions

### 1. Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository (website_tracking)
4. Select "Configure Project"

### 2. Configure Environment Variables

Add the following environment variables in your Vercel project settings:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

### 3. Deploy Settings

The deployment will automatically use these settings from vercel.json:
- Backend: Node.js server at `/backend/server.js`
- Frontend: Vue.js app built with Vite

### 4. Connect Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Project Settings > API
4. Copy the following values and add them to Vercel environment variables:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - anon public → `VITE_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_KEY`

### 5. Additional Configuration

- Database: The application will automatically use Supabase as the database
- API: Backend API routes are configured under the `/api` path
- Static Files: Frontend static files are served from the `/dist` directory

### 6. Deployment

- Vercel will automatically deploy when you push to the main branch
- You can also manually trigger deployments from the Vercel dashboard

## Next steps
- Replace placeholder content in `src/views/Thesis.vue` with your chapters
- Add components for figures, references, and navigation as needed
