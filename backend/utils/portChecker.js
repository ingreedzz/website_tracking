/**
 * Port availability checker utility
 * Helps prevent port conflicts by checking if a port is available before binding
 */

const net = require('net');

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @param {string} host - Host to check (default: '0.0.0.0')
 * @returns {Promise<boolean>} - True if port is available, false otherwise
 */
async function isPortAvailable(port, host = '0.0.0.0') {
  console.log(`[PORT_CHECK] Checking port ${port} on ${host}...`);
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[PORT_CHECK] ❌ Port ${port} is already in use`);
        console.error(`[PORT_CHECK] Error details:`, {
          code: err.code,
          errno: err.errno,
          syscall: err.syscall,
          address: err.address,
          port: err.port
        });
        resolve(false);
      } else {
        console.error(`[PORT_CHECK] ❌ Unexpected error checking port ${port}:`, err.message);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      console.log(`[PORT_CHECK] ✓ Port ${port} is available`);
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port, host);
  });
}

/**
 * Find an available port starting from a given port
 * @param {number} startPort - Port to start checking from
 * @param {number} maxAttempts - Maximum number of ports to try (default: 10)
 * @param {string} host - Host to check (default: '0.0.0.0')
 * @returns {Promise<number|null>} - Available port number or null if none found
 */
async function findAvailablePort(startPort, maxAttempts = 10, host = '0.0.0.0') {
  console.log(`[PORT_CHECK] Searching for available port starting from ${startPort}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port, host);
    
    if (available) {
      console.log(`[PORT_CHECK] ✓ Found available port: ${port}`);
      return port;
    }
  }
  
  console.error(`[PORT_CHECK] ❌ No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
  return null;
}

/**
 * Log current port usage information
 */
function logPortInfo(port) {
  console.log(`[PORT_CHECK] === Port Configuration ===`);
  console.log(`[PORT_CHECK] Target port: ${port}`);
  console.log(`[PORT_CHECK] Process ID: ${process.pid}`);
  console.log(`[PORT_CHECK] Node version: ${process.version}`);
  console.log(`[PORT_CHECK] Platform: ${process.platform}`);
  console.log(`[PORT_CHECK] Environment: ${process.env.NODE_ENV || 'not set'}`);
  
  // Log environment-specific port configurations
  const portEnvVars = [
    'PORT',
    'VITE_PORT',
    'SERVER_PORT',
    'HTTP_PORT',
    'APP_PORT'
  ];
  
  console.log(`[PORT_CHECK] Port-related environment variables:`);
  portEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`[PORT_CHECK]   ${varName}=${value}`);
    }
  });
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  logPortInfo
};
