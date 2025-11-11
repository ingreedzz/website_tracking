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
}