const { getAllUsers } = require('../models/userModel');

async function fetchUsers(req, res) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { fetchUsers };