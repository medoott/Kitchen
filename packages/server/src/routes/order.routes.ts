import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff, requireRole } from '../middleware/auth.js';
import { createOrder, listOrders, listCustomerOrders, getOrder, updateOrderStatus } from '../controllers/order.controller.js';

const router = Router();

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, createOrder);

// Customer: view own orders
router.get('/my-orders', authenticate, listCustomerOrders);

// Staff: list and manage orders
router.get('/', authenticate, requireStaff, listOrders);
router.get('/:id', authenticate, getOrder);
router.patch('/:id/status', authenticate, requireStaff, updateOrderStatus);

export default router;
