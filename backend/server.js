const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});