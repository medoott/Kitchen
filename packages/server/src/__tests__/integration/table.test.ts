import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { count: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);

const app = createApp();

const adminToken = generateToken({ id: '1', email: 'admin@test.com', type: 'staff', role: 'SUPER_ADMIN' });
const managerToken = generateToken({ id: '2', email: 'mgr@test.com', type: 'staff', role: 'MANAGER' });
const staffToken = generateToken({ id: '3', email: 'staff@test.com', type: 'staff', role: 'STAFF' });

const sampleLocation = { id: 'loc-1', name: 'Downtown Kitchen' };
const sampleTable = {
  id: 'tbl-1',
  locationId: 'loc-1',
  name: 'Table 1',
  capacity: 4,
  isActive: true,
};

describe('Table API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // LIST
  // ============================================================
  describe('GET /api/locations/:locationId/tables', () => {
    it('returns tables for a location', async () => {
      mockedPrisma.location.findUnique.mockResolvedValue(sampleLocation as any);
      mockedPrisma.table.findMany.mockResolvedValue([
        { ...sampleTable, _count: { reservations: 2 } },
      ] as any);

      const res = await request(app).get('/api/locations/loc-1/tables');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Table 1');
      expect(res.body.data[0].capacity).toBe(4);
    });

    it('returns 404 for unknown location', async () => {
      mockedPrisma.location.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/locations/unknown/tables');
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // GET
  // ============================================================
  describe('GET /api/locations/:locationId/tables/:tableId', () => {
    it('returns a single table', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue({
        ...sampleTable,
        _count: { reservations: 0 },
      } as any);

      const res = await request(app).get('/api/locations/loc-1/tables/tbl-1');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Table 1');
    });

    it('returns 404 for table not in location', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/locations/loc-1/tables/unknown');
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // CREATE
  // ============================================================
  describe('POST /api/locations/:locationId/tables', () => {
    const newTable = { name: 'Table 2', capacity: 6 };

    it('requires authentication', async () => {
      const res = await request(app).post('/api/locations/loc-1/tables').send(newTable);
      expect(res.status).toBe(401);
    });

    it('requires MANAGER+ role', async () => {
      const res = await request(app)
        .post('/api/locations/loc-1/tables')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(newTable);
      expect(res.status).toBe(403);
    });

    it('creates a table', async () => {
      mockedPrisma.location.findUnique.mockResolvedValue(sampleLocation as any);
      mockedPrisma.table.findFirst.mockResolvedValue(null);
      mockedPrisma.table.create.mockResolvedValue({ id: 'tbl-2', locationId: 'loc-1', ...newTable, isActive: true } as any);

      const res = await request(app)
        .post('/api/locations/loc-1/tables')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newTable);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Table 2');
    });

    it('returns 404 for unknown location', async () => {
      mockedPrisma.location.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/locations/unknown/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTable);

      expect(res.status).toBe(404);
    });

    it('returns 409 for duplicate name within location', async () => {
      mockedPrisma.location.findUnique.mockResolvedValue(sampleLocation as any);
      mockedPrisma.table.findFirst.mockResolvedValue(sampleTable as any);

      const res = await request(app)
        .post('/api/locations/loc-1/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Table 1', capacity: 4 });

      expect(res.status).toBe(409);
    });

    it('validates capacity must be at least 1', async () => {
      const res = await request(app)
        .post('/api/locations/loc-1/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad', capacity: 0 });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================
  describe('PATCH /api/locations/:locationId/tables/:tableId', () => {
    it('updates table capacity', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(sampleTable as any);
      mockedPrisma.table.update.mockResolvedValue({ ...sampleTable, capacity: 8 } as any);

      const res = await request(app)
        .patch('/api/locations/loc-1/tables/tbl-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ capacity: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(8);
    });

    it('returns 404 for unknown table', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/locations/loc-1/tables/unknown')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ capacity: 4 });

      expect(res.status).toBe(404);
    });

    it('returns 409 when renaming to existing name', async () => {
      mockedPrisma.table.findFirst
        .mockResolvedValueOnce(sampleTable as any) // existing lookup
        .mockResolvedValueOnce({ id: 'tbl-other', name: 'Table 2' } as any); // duplicate check

      const res = await request(app)
        .patch('/api/locations/loc-1/tables/tbl-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Table 2' });

      expect(res.status).toBe(409);
    });
  });

  // ============================================================
  // DELETE
  // ============================================================
  describe('DELETE /api/locations/:locationId/tables/:tableId', () => {
    it('requires SUPER_ADMIN role', async () => {
      const res = await request(app)
        .delete('/api/locations/loc-1/tables/tbl-1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for unknown table', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/locations/loc-1/tables/unknown')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 409 if table has reservations', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(sampleTable as any);
      mockedPrisma.reservation.count.mockResolvedValue(3);

      const res = await request(app)
        .delete('/api/locations/loc-1/tables/tbl-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('deletes table with no reservations', async () => {
      mockedPrisma.table.findFirst.mockResolvedValue(sampleTable as any);
      mockedPrisma.reservation.count.mockResolvedValue(0);
      mockedPrisma.table.delete.mockResolvedValue(sampleTable as any);

      const res = await request(app)
        .delete('/api/locations/loc-1/tables/tbl-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Table deleted');
    });
  });
});
