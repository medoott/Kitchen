import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  callWaiter,
  listCallWaiter,
  updateCallWaiter,
} from '../controllers/call-waiter.controller.js';

const router = Router();

// Public: customer calls the waiter from a table (no login)
router.post('/tables/:token', callWaiter);

// Staff: manage call-waiter requests
router.get('/', authenticate, requireStaff, listCallWaiter);
router.patch('/:id', authenticate, requireStaff, updateCallWaiter);

export default router;
