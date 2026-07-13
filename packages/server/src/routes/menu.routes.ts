import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import {
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemImage,
  deleteMenuItemImage,
} from '../controllers/menu-item.controller.js';
import { upload } from '../middleware/upload.js';
import {
  listAllergens,
  createAllergen,
  deleteAllergen,
} from '../controllers/allergen.controller.js';
import {
  listMealtimes,
  createMealtime,
  updateMealtime,
  deleteMealtime,
} from '../controllers/mealtime.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();

// Categories - read is open, write requires Manager+
router.get('/categories', listCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createCategory);
router.patch('/categories/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateCategory);
router.delete('/categories/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteCategory);

// Menu items - read is open, write requires Manager+
router.get('/items', listMenuItems);
router.get('/items/:id', getMenuItem);
router.post('/items', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createMenuItem);
router.patch('/items/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateMenuItem);
router.delete('/items/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteMenuItem);
router.post('/items/:id/image', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), upload.single('image'), uploadMenuItemImage);
router.delete('/items/:id/image', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), deleteMenuItemImage);

// Allergens - read is open, write requires Manager+
router.get('/allergens', listAllergens);
router.post('/allergens', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createAllergen);
router.delete('/allergens/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteAllergen);

// Mealtimes - read is open, write requires Manager+
router.get('/mealtimes', listMealtimes);
router.post('/mealtimes', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createMealtime);
router.patch('/mealtimes/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateMealtime);
router.delete('/mealtimes/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteMealtime);

export default router;
