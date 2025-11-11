/**
 * Centralized error handling middleware for Express
 * Catches all errors and provides structured, consistent error responses
 */

/**
 * Error logging middleware - logs all errors before response
 */
function logError(err, req, res, next) {
  console.error('[ERROR] === Error caught by middleware ===');
  console.error('[ERROR] Timestamp:', new Date().toISOString());
  console.error('[ERROR] Method:', req.method);
  console.error('[ERROR] Path:', req.path);
  console.error('[ERROR] Query:', req.query);
  console.error('[ERROR] Body:', req.body ? JSON.stringify(req.body, null, 2) : 'none');
  console.error('[ERROR] User:', req.user ? JSON.stringify(req.user, null, 2) : 'not authenticated');
  console.error('[ERROR] Error name:', err.name);
  console.error('[ERROR] Error message:', err.message);
  console.error('[ERROR] Error stack:', err.stack);
  
  // Log full error object with all properties
  if (err) {
    const errorDetails = {};
    Object.getOwnPropertyNames(err).forEach(key => {
      errorDetails[key] = err[key];
    });
    console.error('[ERROR] Full error details:', JSON.stringify(errorDetails, null, 2));
  }
  
  next(err);
}

/**
 * Main error handler - sends structured error response to client
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
  
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (err.name === 'NotFoundError' || err.statusCode === 404) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // Override with custom message if provided
  if (err.message) {
    message = err.message;
  }

  // Build error response
  const errorResponse = {
    error: message,
    code: errorCode
  };

  // Add details in development mode
  if (isDev) {
    errorResponse.details = err.details || err.message || String(err);
    if (err.stack) {
      errorResponse.stack = err.stack;
    }
  } else if (err.details) {
    // In production, only include details if explicitly set
    errorResponse.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler - catches requests to non-existent routes
 * Should be added after all route handlers
 */
function notFoundHandler(req, res, next) {
  // Skip for non-API routes (let SPA handle them)
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  const err = new Error(`Route not found: ${req.method} ${req.path}`);
  err.statusCode = 404;
  err.name = 'NotFoundError';
  next(err);
}

module.exports = {
  logError,
  errorHandler,
  notFoundHandler
};
