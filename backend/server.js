const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { checkDatabaseConnection } = require('./utils/database');
const { initSupabase } = require('./utils/supabase');
const { logError, errorHandler, notFoundHandler } = require('./middleware/error');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase and check connection
async function initializeDatabase() {
    try {
        // Initialize Supabase client
        initSupabase();
        
        // Check database connection
        const connectionStatus = await checkDatabaseConnection();
        if (connectionStatus.status !== 'connected') {
            throw new Error(`Database connection failed: ${connectionStatus.error}`);
        }
        console.log('✓ Database connected successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

// Parse JSON bodies for API routes

// Enable CORS for dev (adjust origin as needed)
app.use(cors());
app.use(express.json());

// Simple request logger to help debugging in Vercel function logs
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
});

// API routes
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// 404 handler for API routes (must come after all API routes)
app.use(notFoundHandler);

// Error handling middleware (must come after all routes)
app.use(logError);
app.use(errorHandler);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for SPA (let client router handle it)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export the app so it can be used by serverless handlers.
module.exports = app;

// If this file is executed directly, run the database initialization and start
// the HTTP server. When imported (for serverless), we only export the app.
if (require.main === module) {
    // Start the server with optional database initialization
    if (process.env.SKIP_DB_CHECK === 'true') {
        console.warn('⚠️ SKIP_DB_CHECK=true — starting server without database initialization');
        app.listen(port, () => {
            console.log(`✓ Server running at http://localhost:${port}`);
        });
    } else {
        initializeDatabase().then(() => {
            app.listen(port, () => {
                console.log(`✓ Server running at http://localhost:${port}`);
            });
        }).catch(error => {
            console.error('Failed to start server:', error);
            process.exit(1);
        });
    }
}