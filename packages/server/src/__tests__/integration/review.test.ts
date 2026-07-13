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
    review: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
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

const sampleReview = {
  id: 'rev-1',
  customerId: 'cust-1',
  locationId: 'loc-1',
  orderId: null,
  rating: 5,
  comment: 'Great food!',
  isApproved: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: { id: 'cust-1', name: 'John' },
  location: { id: 'loc-1', name: 'Downtown Kitchen' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Review API', () => {
  describe('POST /api/reviews', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/reviews').send({ locationId: 'loc-1', rating: 5 });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ locationId: '', rating: 6 });
      expect(res.status).toBe(400);
    });

    it('returns 400 for non-existent location', async () => {
      mockedPrisma.location.findUnique.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ locationId: 'bad-id', rating: 5 });
      expect(res.status).toBe(400);
    });

    it('creates review successfully', async () => {
      mockedPrisma.location.findUnique.mockResolvedValueOnce({ id: 'loc-1', name: 'Kitchen' } as any);
      mockedPrisma.review.create.mockResolvedValueOnce(sampleReview as any);
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ locationId: 'loc-1', rating: 5, comment: 'Great food!' });
      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
    });
  });

  describe('GET /api/reviews', () => {
    it('returns 403 for non-staff', async () => {
      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns paginated list for staff', async () => {
      mockedPrisma.review.findMany.mockResolvedValueOnce([sampleReview] as any);
      mockedPrisma.review.count.mockResolvedValueOnce(1);
      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/reviews/location/:locationId', () => {
    it('returns approved reviews for location', async () => {
      mockedPrisma.review.findMany.mockResolvedValueOnce([{ ...sampleReview, isApproved: true }] as any);
      mockedPrisma.review.count.mockResolvedValueOnce(1);
      mockedPrisma.review.aggregate.mockResolvedValueOnce({ _avg: { rating: 4.5 }, _count: 1 } as any);
      const res = await request(app).get('/api/reviews/location/loc-1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.summary.averageRating).toBe(4.5);
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    it('returns 404 if not found', async () => {
      mockedPrisma.review.findUnique.mockResolvedValueOnce(null);
      const res = await request(app)
        .patch('/api/reviews/bad-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isApproved: true });
      expect(res.status).toBe(404);
    });

    it('moderates review', async () => {
      mockedPrisma.review.findUnique.mockResolvedValueOnce(sampleReview as any);
      mockedPrisma.review.update.mockResolvedValueOnce({ ...sampleReview, isApproved: true } as any);
      const res = await request(app)
        .patch('/api/reviews/rev-1')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isApproved: true });
      expect(res.status).toBe(200);
      expect(res.body.data.isApproved).toBe(true);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('returns 404 if not found', async () => {
      mockedPrisma.review.findUnique.mockResolvedValueOnce(null);
      const res = await request(app)
        .delete('/api/reviews/bad-id')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes review', async () => {
      mockedPrisma.review.findUnique.mockResolvedValueOnce(sampleReview as any);
      mockedPrisma.review.delete.mockResolvedValueOnce(sampleReview as any);
      const res = await request(app)
        .delete('/api/reviews/rev-1')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
    });
  });
});
