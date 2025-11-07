const express = require('express');
const OrderController = require('../controllers/index').OrderController;
const { fetchUsers, createUser } = require('../controllers/index');

const router = express.Router();
const orderController = new OrderController();

function setRoutes(app) {
    router.post('/orders', orderController.createOrder.bind(orderController));
    router.get('/orders/:id', orderController.getOrder.bind(orderController));
    router.put('/orders/:id', orderController.updateOrder.bind(orderController));

    router.get('/users', fetchUsers);
    router.post('/users', createUser);

    app.use('/api', router);
}

module.exports = setRoutes;