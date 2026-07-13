import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { getTableByToken, getTableQrImage } from '../controllers/qr.controller.js';

const router = Router();

// Public: resolve a table by its QR token (storefront entry point)
router.get('/table/:token', getTableByToken);

// Staff: downloadable QR image for a table
router.get('/tables/:tableId/image', authenticate, requireStaff, getTableQrImage);

export default router;
