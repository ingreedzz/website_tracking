// filepath: backend/middleware/auth.js
module.exports = (req, res, next) => {
  // Example authentication middleware
  console.log('Authentication middleware');
  next();
};