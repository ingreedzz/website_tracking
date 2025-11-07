import { getAllUsers, addUser } from '../../src/models/index';

class OrderController {
    async createOrder(req, res) {
        // Logic to create a new order
    }

    async getOrder(req, res) {
        // Logic to retrieve an existing order
    }

    async updateOrder(req, res) {
        // Logic to update an existing order
    }

    // Fetch all users
    async fetchUsers(req, res) {
        try {
            const users = await getAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Add a new user
    async createUser(req, res) {
        try {
            const user = req.body;
            const newUser = await addUser(user);
            res.status(201).json(newUser);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default OrderController;