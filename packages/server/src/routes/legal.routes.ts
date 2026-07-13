import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  listLegalPages,
  getLegalPage,
  upsertLegalPage,
  listCookieCategories,
  createCookieCategory,
  updateCookieCategory,
  deleteCookieCategory,
} from '../controllers/legal.controller.js';

const router = Router();

// Cookie categories must be matched before :slug
router.get('/cookie-categories', listCookieCategories);
router.post('/cookie-categories', authenticate, requireStaff, createCookieCategory);
router.patch('/cookie-categories/:id', authenticate, requireStaff, updateCookieCategory);
router.delete('/cookie-categories/:id', authenticate, requireStaff, deleteCookieCategory);

// Legal pages
router.get('/', listLegalPages);
router.get('/:slug', getLegalPage);
router.put('/:slug', authenticate, requireStaff, upsertLegalPage);

export default router;
