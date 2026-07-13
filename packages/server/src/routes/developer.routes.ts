import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { getMetrics, getEndpointMetrics, getAuditLogs } from '../controllers/developer.controller.js';

const router = Router();

// DEVELOPER only for metrics
router.get('/metrics', authenticate, requireStaff, requireRole('DEVELOPER'), getMetrics);
router.get('/metrics/endpoints', authenticate, requireStaff, requireRole('DEVELOPER'), getEndpointMetrics);

// SUPER_ADMIN only for audit logs
router.get('/audit-logs', authenticate, requireStaff, requireRole('SUPER_ADMIN'), getAuditLogs);

export default router;
