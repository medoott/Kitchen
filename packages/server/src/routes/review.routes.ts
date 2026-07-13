import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import {
  createReview,
  listReviews,
  getLocationReviews,
  moderateReview,
  deleteReview,
} from '../controllers/review.controller.js';

const router = Router();

// Public: view approved reviews for a location
router.get('/location/:locationId', getLocationReviews);

// Customer: create review
router.post('/', authenticate, createReview);

// Staff: list all reviews (including unapproved)
router.get('/', authenticate, requireStaff, listReviews);

// Staff: moderate review (approve/reject)
router.patch('/:id', authenticate, requireStaff, moderateReview);

// Admin: delete review
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), deleteReview);

export default router;
