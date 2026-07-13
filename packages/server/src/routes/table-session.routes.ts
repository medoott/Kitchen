import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  createOrGetSession,
  getSession,
  updateCart,
  closeSession,
} from '../controllers/table-session.controller.js';

const router = Router();

// Public: open or resume a table ordering session (no login)
router.post('/', createOrGetSession);
router.get('/:sessionToken', getSession);
router.put('/:sessionToken/cart', updateCart);

// Staff: close a session (frees the table)
router.patch('/:sessionToken/close', authenticate, requireStaff, closeSession);

export default router;
