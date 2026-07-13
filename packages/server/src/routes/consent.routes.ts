import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  recordConsent,
  listConsents,
  consentStats,
} from '../controllers/consent.controller.js';

const router = Router();

// Public: record consent
router.post('/', recordConsent);

// Staff: view consent log and stats
router.get('/', authenticate, requireStaff, listConsents);
router.get('/stats', authenticate, requireStaff, consentStats);

export default router;
