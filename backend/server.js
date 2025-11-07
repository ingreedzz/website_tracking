const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { checkDatabaseConnection } = require('./utils/database');
const { initSupabase } = require('./utils/supabase');

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

// API routes
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for SPA (let client router handle it)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server with database initialization
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`✓ Server running at http://localhost:${port}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});