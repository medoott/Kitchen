import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { count: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    coupon: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock('../../lib/stripe.js', () => ({
  default: {
    paymentIntents: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);

const app = createApp();

const staffToken = generateToken({ id: '1', email: 'admin@test.com', type: 'staff', role: 'SUPER_ADMIN' });
const customerToken = generateToken({ id: 'cust-1', email: 'customer@test.com', type: 'customer' });

const sampleCoupon = {
  id: 'coupon-1',
  code: 'SAVE20',
  type: 'PERCENTAGE',
  value: 20,
  minOrder: 10,
  maxDiscount: 50,
  usageLimit: 100,
  usageCount: 5,
  perCustomer: 1,
  startsAt: null,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Coupon API', () => {
  describe('POST /api/coupons', () => {
    it('returns 403 for non-staff', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'TEST', type: 'FIXED', value: 5 });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: '', type: 'INVALID', value: -1 });
      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate code', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(sampleCoupon as any);
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'SAVE20', type: 'PERCENTAGE', value: 20 });
      expect(res.status).toBe(409);
    });

    it('creates coupon successfully', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(null);
      mockedPrisma.coupon.create.mockResolvedValueOnce(sampleCoupon as any);
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'SAVE20', type: 'PERCENTAGE', value: 20, minOrder: 10 });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('SAVE20');
    });
  });

  describe('GET /api/coupons', () => {
    it('returns paginated list for staff', async () => {
      mockedPrisma.coupon.findMany.mockResolvedValueOnce([sampleCoupon] as any);
      mockedPrisma.coupon.count.mockResolvedValueOnce(1);
      const res = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/coupons/:id', () => {
    it('returns 404 if not found', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(null);
      const res = await request(app)
        .patch('/api/coupons/bad-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isActive: false });
      expect(res.status).toBe(404);
    });

    it('updates coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(sampleCoupon as any);
      mockedPrisma.coupon.update.mockResolvedValueOnce({ ...sampleCoupon, isActive: false } as any);
      const res = await request(app)
        .patch('/api/coupons/coupon-1')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isActive: false });
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/coupons/:id', () => {
    it('returns 404 if not found', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(null);
      const res = await request(app)
        .delete('/api/coupons/bad-id')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(sampleCoupon as any);
      mockedPrisma.coupon.delete.mockResolvedValueOnce(sampleCoupon as any);
      const res = await request(app)
        .delete('/api/coupons/coupon-1')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/coupons/validate', () => {
    it('returns 400 without code', async () => {
      const res = await request(app).post('/api/coupons/validate').send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for invalid code', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(null);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'INVALID' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for inactive coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({ ...sampleCoupon, isActive: false } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for expired coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({
        ...sampleCoupon,
        expiresAt: new Date('2020-01-01'),
      } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when usage limit reached', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({
        ...sampleCoupon,
        usageLimit: 5,
        usageCount: 5,
      } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when below min order', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(sampleCoupon as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20', subtotal: 5 });
      expect(res.status).toBe(400);
    });

    it('validates percentage coupon successfully', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce(sampleCoupon as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20', subtotal: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.discount).toBe(20);
    });

    it('caps percentage discount at maxDiscount', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({
        ...sampleCoupon,
        maxDiscount: 10,
      } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20', subtotal: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.discount).toBe(10);
    });

    it('validates fixed coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({
        ...sampleCoupon,
        type: 'FIXED',
        value: 5,
        minOrder: 0,
      } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20', subtotal: 20 });
      expect(res.status).toBe(200);
      expect(res.body.data.discount).toBe(5);
    });

    it('validates free delivery coupon', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValueOnce({
        ...sampleCoupon,
        type: 'FREE_DELIVERY',
        value: 0,
        minOrder: 0,
      } as any);
      const res = await request(app).post('/api/coupons/validate').send({ code: 'SAVE20', subtotal: 20 });
      expect(res.status).toBe(200);
      expect(res.body.data.freeDelivery).toBe(true);
    });
  });
});
