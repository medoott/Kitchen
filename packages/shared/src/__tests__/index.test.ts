import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  RESERVATION_STATUSES,
  ORDER_TYPES,
  STAFF_ROLES,
  COUPON_TYPES,
  MENU_OPTION_DISPLAY_TYPES,
} from '../index.js';
import type {
  OrderStatus,
  ReservationStatus,
  OrderType,
  StaffRole,
  CouponType,
  MenuOptionDisplayType,
  ApiResponse,
  PaginatedResponse,
} from '../index.js';

describe('Shared Constants', () => {
  describe('ORDER_STATUSES', () => {
    it('contains all expected order statuses', () => {
      expect(ORDER_STATUSES).toContain('pending');
      expect(ORDER_STATUSES).toContain('confirmed');
      expect(ORDER_STATUSES).toContain('preparing');
      expect(ORDER_STATUSES).toContain('ready');
      expect(ORDER_STATUSES).toContain('out_for_delivery');
      expect(ORDER_STATUSES).toContain('delivered');
      expect(ORDER_STATUSES).toContain('picked_up');
      expect(ORDER_STATUSES).toContain('cancelled');
    });

    it('has exactly 8 statuses', () => {
      expect(ORDER_STATUSES).toHaveLength(8);
    });

    it('starts with pending and ends with cancelled', () => {
      expect(ORDER_STATUSES[0]).toBe('pending');
      expect(ORDER_STATUSES[ORDER_STATUSES.length - 1]).toBe('cancelled');
    });
  });

  describe('RESERVATION_STATUSES', () => {
    it('contains all expected reservation statuses', () => {
      expect(RESERVATION_STATUSES).toContain('pending');
      expect(RESERVATION_STATUSES).toContain('confirmed');
      expect(RESERVATION_STATUSES).toContain('seated');
      expect(RESERVATION_STATUSES).toContain('completed');
      expect(RESERVATION_STATUSES).toContain('cancelled');
    });

    it('has exactly 5 statuses', () => {
      expect(RESERVATION_STATUSES).toHaveLength(5);
    });
  });

  describe('ORDER_TYPES', () => {
    it('contains delivery and pickup', () => {
      expect(ORDER_TYPES).toEqual(['delivery', 'pickup']);
    });

    it('has exactly 2 types', () => {
      expect(ORDER_TYPES).toHaveLength(2);
    });
  });

  describe('STAFF_ROLES', () => {
    it('contains all expected roles', () => {
      expect(STAFF_ROLES).toContain('super_admin');
      expect(STAFF_ROLES).toContain('manager');
      expect(STAFF_ROLES).toContain('staff');
    });

    it('has exactly 3 roles', () => {
      expect(STAFF_ROLES).toHaveLength(3);
    });
  });

  describe('COUPON_TYPES', () => {
    it('contains all expected coupon types', () => {
      expect(COUPON_TYPES).toContain('percentage');
      expect(COUPON_TYPES).toContain('fixed');
      expect(COUPON_TYPES).toContain('free_delivery');
    });

    it('has exactly 3 types', () => {
      expect(COUPON_TYPES).toHaveLength(3);
    });
  });

  describe('MENU_OPTION_DISPLAY_TYPES', () => {
    it('contains all expected display types', () => {
      expect(MENU_OPTION_DISPLAY_TYPES).toContain('select');
      expect(MENU_OPTION_DISPLAY_TYPES).toContain('radio');
      expect(MENU_OPTION_DISPLAY_TYPES).toContain('checkbox');
      expect(MENU_OPTION_DISPLAY_TYPES).toContain('quantity');
    });

    it('has exactly 4 types', () => {
      expect(MENU_OPTION_DISPLAY_TYPES).toHaveLength(4);
    });
  });
});

describe('Shared Types', () => {
  it('ApiResponse type can represent success', () => {
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: '123' },
    };
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: '123' });
  });

  it('ApiResponse type can represent error', () => {
    const response: ApiResponse = {
      success: false,
      error: 'Something went wrong',
    };
    expect(response.success).toBe(false);
    expect(response.error).toBe('Something went wrong');
  });

  it('PaginatedResponse type includes pagination metadata', () => {
    const response: PaginatedResponse<{ name: string }> = {
      success: true,
      data: [{ name: 'Item 1' }, { name: 'Item 2' }],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    };
    expect(response.pagination.page).toBe(1);
    expect(response.pagination.totalPages).toBe(1);
    expect(response.data).toHaveLength(2);
  });

  // Type-level tests: these just verify types compile correctly
  it('type aliases resolve correctly', () => {
    const status: OrderStatus = 'pending';
    const resStatus: ReservationStatus = 'confirmed';
    const orderType: OrderType = 'delivery';
    const role: StaffRole = 'super_admin';
    const couponType: CouponType = 'percentage';
    const displayType: MenuOptionDisplayType = 'checkbox';

    expect(status).toBe('pending');
    expect(resStatus).toBe('confirmed');
    expect(orderType).toBe('delivery');
    expect(role).toBe('super_admin');
    expect(couponType).toBe('percentage');
    expect(displayType).toBe('checkbox');
  });
});
