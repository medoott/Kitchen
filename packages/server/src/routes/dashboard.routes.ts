import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { getDashboardStats, getAnalytics } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/stats', authenticate, requireStaff, getDashboardStats);
router.get('/analytics', authenticate, requireStaff, getAnalytics);

export default router;
