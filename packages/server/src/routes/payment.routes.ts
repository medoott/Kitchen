import { Router } from 'express';
import express from 'express';
import { optionalAuth, authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import {
  getPaymentMethods,
  listPayments,
  createPaymentIntent,
  createCheckoutSession,
  handleWebhook,
  createCashPayment,
  confirmPayment,
  createPayPalPayment,
  capturePayPalPayment,
  refundPayment,
  getReceipt,
  sendReceiptEmail,
} from '../controllers/payment.controller.js';

const router = Router();

// Stripe webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Public: which methods are enabled + publishable keys (never secrets)
router.get('/methods', getPaymentMethods);

// Staff: list payments (audit)
router.get('/', authenticate, requireStaff, listPayments);

// PaymentIntent (mobile app — flutter_stripe PaymentSheet)
router.post('/create-intent', optionalAuth, createPaymentIntent);

// Checkout Session (website — hosted Stripe page)
router.post('/create-checkout-session', optionalAuth, createCheckoutSession);

// Cash: create "awaiting staff" payment (staff records at POS/counter)
router.post('/cash', authenticate, requireStaff, createCashPayment);

// Staff confirms a cash/in-person card payment (idempotent)
router.post('/confirm', authenticate, requireStaff, confirmPayment);

// PayPal
router.post('/paypal/create', optionalAuth, createPayPalPayment);
router.post('/paypal/capture', optionalAuth, capturePayPalPayment);

// Refund (manager / super-admin)
router.post('/refund', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), refundPayment);

// Receipt (order owner or staff)
router.get('/receipt/:orderId', optionalAuth, getReceipt);
router.post('/receipt/:orderId/email', optionalAuth, sendReceiptEmail);

export default router;
