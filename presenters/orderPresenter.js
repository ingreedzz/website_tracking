const { getAllOrders } = require('../models/orderModel');

async function fetchOrders(req, res) {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { fetchOrders };