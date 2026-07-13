import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  generateToken,
  verifyToken,
  authenticate,
  requireStaff,
  requireRole,
  optionalAuth,
  JwtPayload,
} from '../../middleware/auth.js';

// Helper to create mock Express objects
function createMocks(overrides: {
  headers?: Record<string, string>;
  user?: JwtPayload;
} = {}) {
  const req = {
    headers: overrides.headers || {},
    user: overrides.user,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('Auth Middleware - Unit Tests', () => {
  describe('generateToken / verifyToken', () => {
    it('generates a valid JWT token', () => {
      const payload: JwtPayload = {
        id: 'user-123',
        email: 'test@example.com',
        type: 'staff',
        role: 'SUPER_ADMIN',
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('verifyToken decodes a valid token correctly', () => {
      const payload: JwtPayload = {
        id: 'user-456',
        email: 'admin@example.com',
        type: 'staff',
        role: 'MANAGER',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe('user-456');
      expect(decoded.email).toBe('admin@example.com');
      expect(decoded.type).toBe('staff');
      expect(decoded.role).toBe('MANAGER');
    });

    it('verifyToken throws on invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('verifyToken throws on tampered token', () => {
      const token = generateToken({
        id: 'user-1',
        email: 'test@test.com',
        type: 'customer',
      });
      // Tamper with the token payload
      const parts = token.split('.');
      parts[1] = 'tampered';
      expect(() => verifyToken(parts.join('.'))).toThrow();
    });

    it('generates different tokens for different payloads', () => {
      const token1 = generateToken({ id: '1', email: 'a@a.com', type: 'staff' });
      const token2 = generateToken({ id: '2', email: 'b@b.com', type: 'customer' });
      expect(token1).not.toBe(token2);
    });

    it('generates tokens for customer type (no role)', () => {
      const payload: JwtPayload = {
        id: 'cust-1',
        email: 'customer@example.com',
        type: 'customer',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.type).toBe('customer');
      expect(decoded.role).toBeUndefined();
    });
  });

  describe('authenticate', () => {
    it('returns 401 when no authorization header', () => {
      const { req, res, next } = createMocks();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when authorization header does not start with Bearer', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Basic abc123' },
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid token', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Bearer invalid-token' },
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.user and calls next for valid token', () => {
      const payload: JwtPayload = {
        id: 'user-1',
        email: 'test@test.com',
        type: 'staff',
        role: 'STAFF',
      };
      const token = generateToken(payload);
      const { req, res, next } = createMocks({
        headers: { authorization: `Bearer ${token}` },
      });

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user!.id).toBe('user-1');
      expect(req.user!.email).toBe('test@test.com');
      expect(req.user!.type).toBe('staff');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireStaff', () => {
    it('returns 403 when user is not set', () => {
      const { req, res, next } = createMocks();

      requireStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Staff access required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user is a customer', () => {
      const { req, res, next } = createMocks({
        user: { id: '1', email: 'c@c.com', type: 'customer' },
      });

      requireStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when user is staff', () => {
      const { req, res, next } = createMocks({
        user: { id: '1', email: 's@s.com', type: 'staff', role: 'STAFF' },
      });

      requireStaff(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('returns 403 when user has no role', () => {
      const middleware = requireRole('SUPER_ADMIN');
      const { req, res, next } = createMocks({
        user: { id: '1', email: 'c@c.com', type: 'customer' },
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user role is not in allowed roles', () => {
      const middleware = requireRole('SUPER_ADMIN');
      const { req, res, next } = createMocks({
        user: { id: '1', email: 's@s.com', type: 'staff', role: 'STAFF' },
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when user role matches', () => {
      const middleware = requireRole('SUPER_ADMIN', 'MANAGER');
      const { req, res, next } = createMocks({
        user: { id: '1', email: 's@s.com', type: 'staff', role: 'MANAGER' },
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('works with SUPER_ADMIN role', () => {
      const middleware = requireRole('SUPER_ADMIN');
      const { req, res, next } = createMocks({
        user: { id: '1', email: 'a@a.com', type: 'staff', role: 'SUPER_ADMIN' },
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('optionalAuth', () => {
    it('calls next without setting user when no auth header', () => {
      const { req, res, next } = createMocks();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next without setting user when token is invalid', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Bearer invalid-token' },
      });

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('sets user and calls next when token is valid', () => {
      const token = generateToken({
        id: 'user-1',
        email: 'test@test.com',
        type: 'staff',
        role: 'STAFF',
      });
      const { req, res, next } = createMocks({
        headers: { authorization: `Bearer ${token}` },
      });

      optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user!.id).toBe('user-1');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('does not set user for non-Bearer auth schemes', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Basic abc123' },
      });

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
