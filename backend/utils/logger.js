/**
 * Enhanced logging utility with request correlation and structured logging
 */

const { randomUUID } = require('crypto');

/**
 * Log levels for filtering
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and context
 */
function formatLog(level, category, message, data = null, requestId = null) {
  const timestamp = new Date().toISOString();
  const rid = requestId ? `[REQ:${requestId}]` : '';
  let output = `[${timestamp}] ${rid} [${level}] [${category}] ${message}`;
  
  if (data !== null && data !== undefined) {
    if (typeof data === 'object') {
      output += '\n' + JSON.stringify(data, null, 2);
    } else {
      output += ` ${data}`;
    }
  }
  
  return output;
}

/**
 * Debug level logging
 */
function debug(category, message, data = null, requestId = null) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', category, message, data, requestId));
  }
}

/**
 * Info level logging
 */
function info(category, message, data = null, requestId = null) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', category, message, data, requestId));
  }
}

/**
 * Warning level logging
 */
function warn(category, message, data = null, requestId = null) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', category, message, data, requestId));
  }
}

/**
 * Error level logging
 */
function error(category, message, errorObj = null, requestId = null) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', category, message, null, requestId));
    
    if (errorObj) {
      if (errorObj instanceof Error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${category}] Error details:`, {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack,
          ...Object.getOwnPropertyNames(errorObj).reduce((acc, key) => {
            if (!['name', 'message', 'stack'].includes(key)) {
              acc[key] = errorObj[key];
            }
            return acc;
          }, {})
        });
      } else {
        console.error(`[${new Date().toISOString()}] [ERROR] [${category}] Error data:`, errorObj);
      }
    }
  }
}

/**
 * Log operation timing
 */
function logTiming(category, operation, startTime, requestId = null) {
  const duration = Date.now() - startTime;
  info(category, `${operation} completed in ${duration}ms`, null, requestId);
  return duration;
}

/**
 * Log request details
 */
function logRequest(req, requestId) {
  const details = {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers.authorization ? 'Bearer <present>' : 'missing'
    },
    ip: req.ip || req.connection?.remoteAddress,
    body: req.body ? maskSensitiveData(req.body) : undefined,
    files: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : undefined
  };
  
  info('REQUEST', `Incoming ${req.method} ${req.path}`, details, requestId);
}

/**
 * Mask sensitive data in logs
 */
function maskSensitiveData(obj) {
  const sensitive = ['password', 'token', 'secret', 'authorization', 'apikey', 'api_key'];
  const masked = { ...obj };
  
  Object.keys(masked).forEach(key => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });
  
  return masked;
}

/**
 * Create a logger with request context
 */
function createRequestLogger(req) {
  const requestId = req.id || req.headers['x-request-id'] || randomUUID();
  
  return {
    debug: (category, message, data) => debug(category, message, data, requestId),
    info: (category, message, data) => info(category, message, data, requestId),
    warn: (category, message, data) => warn(category, message, data, requestId),
    error: (category, message, errorObj) => error(category, message, errorObj, requestId),
    logTiming: (category, operation, startTime) => logTiming(category, operation, startTime, requestId),
    requestId
  };
}

/**
 * Log system resource usage
 */
function logResourceUsage(category, requestId = null) {
  const usage = process.memoryUsage();
  const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
  
  info(category, 'Resource usage', {
    memory: {
      rss: formatBytes(usage.rss),
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external)
    },
    uptime: process.uptime().toFixed(2) + 's',
    pid: process.pid
  }, requestId);
}

module.exports = {
  LOG_LEVELS,
  debug,
  info,
  warn,
  error,
  logTiming,
  logRequest,
  createRequestLogger,
  maskSensitiveData,
  logResourceUsage
};
