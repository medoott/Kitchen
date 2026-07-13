import { Router } from 'express';
import {
  listStaff,
  getStaff,
  updateStaff,
  deactivateStaff,
  inviteStaff,
  createStaff,
  validateInviteToken,
  acceptInvite,
} from '../controllers/staff.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes (must come before /:id to avoid param capture)
router.get('/invite/:token', validateInviteToken);
router.post('/accept-invite', acceptInvite);

// Authenticated routes
router.get('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), listStaff);
router.post('/invite', authenticate, requireStaff, requireRole('SUPER_ADMIN'), inviteStaff);
router.post('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createStaff);
router.get('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getStaff);
router.patch('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), updateStaff);
router.delete('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deactivateStaff);

export default router;
