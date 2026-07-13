import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

// Mock the Prisma client
vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

// Import the mocked module
import prisma from '../../lib/db.js';

const app = createApp();

const mockedPrisma = vi.mocked(prisma);

describe('Auth API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // STAFF LOGIN
  // ============================================================
  describe('POST /api/auth/staff/login', () => {
    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for password shorter than 6 chars', async () => {
      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'test@example.com', password: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when user not found', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 401 when user is inactive', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'inactive@example.com',
        password: await bcrypt.hash('password123', 12),
        name: 'Inactive',
        role: 'STAFF' as const,
        isActive: false,
        phone: null,
        avatar: null,
        locationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'inactive@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 401 for wrong password', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'staff@example.com',
        password: await bcrypt.hash('correctpassword', 12),
        name: 'Staff',
        role: 'STAFF' as const,
        isActive: true,
        phone: null,
        avatar: null,
        locationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'staff@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 200 with token for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'SUPER_ADMIN' as const,
        isActive: true,
        phone: null,
        avatar: null,
        locationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.id).toBe('user-1');
      expect(res.body.data.user.email).toBe('admin@example.com');
      expect(res.body.data.user.name).toBe('Admin User');
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      // Password should NOT be in response
      expect(res.body.data.user.password).toBeUndefined();
    });
  });

  // ============================================================
  // STAFF REGISTER (requires SUPER_ADMIN auth)
  // ============================================================
  describe('POST /api/auth/staff/register', () => {
    it('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/auth/staff/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'New Staff' });

      expect(res.status).toBe(401);
    });

    it('returns 403 with non-SUPER_ADMIN token', async () => {
      const token = generateToken({
        id: '1',
        email: 'staff@example.com',
        type: 'staff',
        role: 'STAFF',
      });

      const res = await request(app)
        .post('/api/auth/staff/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com', password: 'password123', name: 'New Staff' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Insufficient permissions');
    });

    it('returns 403 with customer token', async () => {
      const token = generateToken({
        id: '1',
        email: 'customer@example.com',
        type: 'customer',
      });

      const res = await request(app)
        .post('/api/auth/staff/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com', password: 'password123', name: 'New Staff' });

      expect(res.status).toBe(403);
    });

    it('returns 409 when email already exists', async () => {
      const token = generateToken({
        id: '1',
        email: 'admin@example.com',
        type: 'staff',
        role: 'SUPER_ADMIN',
      });

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        email: 'existing@example.com',
        password: 'hashed',
        name: 'Existing',
        role: 'STAFF' as const,
        isActive: true,
        phone: null,
        avatar: null,
        locationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/staff/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'existing@example.com', password: 'password123', name: 'New Staff' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('returns 201 with token for valid registration by SUPER_ADMIN', async () => {
      const token = generateToken({
        id: '1',
        email: 'admin@example.com',
        type: 'staff',
        role: 'SUPER_ADMIN',
      });

      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'newstaff@example.com',
        name: 'New Staff',
        role: 'STAFF' as const,
      } as any);

      const res = await request(app)
        .post('/api/auth/staff/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newstaff@example.com', password: 'password123', name: 'New Staff' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('newstaff@example.com');
    });

    it('returns 400 for invalid registration data', async () => {
      const token = generateToken({
        id: '1',
        email: 'admin@example.com',
        type: 'staff',
        role: 'SUPER_ADMIN',
      });

      const res = await request(app)
        .post('/api/auth/staff/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-valid', password: '12', name: '' });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // CUSTOMER REGISTER
  // ============================================================
  describe('POST /api/auth/customer/register', () => {
    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({ email: 'bad-email', password: 'password123', name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 409 when customer email already exists', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
        password: 'hashed',
        name: 'Existing',
        phone: null,
        isGuest: false,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({ email: 'existing@example.com', password: 'password123', name: 'Test' });

      expect(res.status).toBe(409);
    });

    it('returns 201 with token for valid customer registration', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);
      mockedPrisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        email: 'newcustomer@example.com',
        name: 'New Customer',
        phone: '555-0100',
      } as any);

      const res = await request(app)
        .post('/api/auth/customer/register')
        .send({
          email: 'newcustomer@example.com',
          password: 'password123',
          name: 'New Customer',
          phone: '555-0100',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.email).toBe('newcustomer@example.com');
      expect(res.body.data.customer.name).toBe('New Customer');
      expect(res.body.data.customer.phone).toBe('555-0100');
    });
  });

  // ============================================================
  // CUSTOMER LOGIN
  // ============================================================
  describe('POST /api/auth/customer/login', () => {
    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ email: 'bad', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 401 when customer not found', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for guest account with no password', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: '1',
        email: 'guest@example.com',
        password: null,
        name: 'Guest',
        phone: null,
        isGuest: true,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ email: 'guest@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for wrong password', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: '1',
        email: 'customer@example.com',
        password: await bcrypt.hash('correct', 12),
        name: 'Customer',
        phone: null,
        isGuest: false,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ email: 'customer@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 200 with token for valid customer login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'customer@example.com',
        password: hashedPassword,
        name: 'Test Customer',
        phone: '555-0100',
        isGuest: false,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/customer/login')
        .send({ email: 'customer@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.id).toBe('cust-1');
      expect(res.body.data.customer.email).toBe('customer@example.com');
      // Password should NOT be in response
      expect(res.body.data.customer.password).toBeUndefined();
    });
  });

  // ============================================================
  // GET /api/auth/me
  // ============================================================
  describe('GET /api/auth/me', () => {
    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns staff info for staff token', async () => {
      const token = generateToken({
        id: 'user-1',
        email: 'staff@example.com',
        type: 'staff',
        role: 'MANAGER',
      });

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'staff@example.com',
        name: 'Staff Member',
        role: 'MANAGER',
        phone: '555-0100',
        avatar: null,
      } as any);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('staff');
      expect(res.body.data.user.name).toBe('Staff Member');
      expect(res.body.data.user.role).toBe('MANAGER');
    });

    it('returns customer info for customer token', async () => {
      const token = generateToken({
        id: 'cust-1',
        email: 'customer@example.com',
        type: 'customer',
      });

      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'customer@example.com',
        name: 'Test Customer',
        phone: '555-0200',
      } as any);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('customer');
      expect(res.body.data.customer.name).toBe('Test Customer');
    });
  });
});
