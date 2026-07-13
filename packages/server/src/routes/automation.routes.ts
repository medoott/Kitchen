import { Router } from 'express';
import {
  listAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from '../controllers/automation.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), listAutomationRules);
router.get('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getAutomationRule);
router.post('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createAutomationRule);
router.patch('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateAutomationRule);
router.delete('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteAutomationRule);

export default router;
