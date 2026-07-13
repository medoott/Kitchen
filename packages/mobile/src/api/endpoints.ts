import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  AuthLoginData,
  AuthMeData,
  Category,
  MenuItem,
  MenuItemDetail,
  Location,
  Order,
  Reservation,
  TimeSlot,
  User,
} from './types';

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login(email: string, password: string) {
    return apiClient<ApiResponse<AuthLoginData>>('/api/auth/customer/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
  },

  register(data: { email: string; password: string; name: string; phone?: string }) {
    return apiClient<ApiResponse<AuthLoginData>>('/api/auth/customer/register', {
      method: 'POST',
      body: data,
      auth: false,
    });
  },

  getMe() {
    return apiClient<ApiResponse<AuthMeData>>('/api/auth/me');
  },

  savePushToken(expoPushToken: string) {
    return apiClient<ApiResponse<void>>('/api/auth/push-token', {
      method: 'POST',
      body: { expoPushToken },
    });
  },
};

// ── Menu ──────────────────────────────────────────────
export const menuApi = {
  getCategories() {
    return apiClient<ApiResponse<Category[]>>('/api/menu/categories', { auth: false });
  },

  getItems(params?: { categoryId?: string; search?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    qs.set('limit', String(params?.limit ?? 20));
    return apiClient<PaginatedResponse<MenuItem>>(`/api/menu/items?${qs}`, { auth: false });
  },

  getItem(id: string) {
    return apiClient<ApiResponse<MenuItemDetail>>(`/api/menu/items/${id}`, { auth: false });
  },
};

// ── Locations ─────────────────────────────────────────
export const locationApi = {
  getAll() {
    return apiClient<ApiResponse<Location[]>>('/api/locations', { auth: false });
  },

  getById(id: string) {
    return apiClient<ApiResponse<Location>>(`/api/locations/${id}`, { auth: false });
  },
};

// ── Orders ────────────────────────────────────────────
export const orderApi = {
  place(body: Record<string, unknown>) {
    return apiClient<ApiResponse<Order>>('/api/orders', {
      method: 'POST',
      body,
    });
  },

  getById(id: string) {
    return apiClient<ApiResponse<Order>>(`/api/orders/${id}`);
  },

  getHistory(params?: { page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    qs.set('limit', String(params?.limit ?? 10));
    return apiClient<PaginatedResponse<Order>>(`/api/orders?${qs}`);
  },
};

// ── Reservations ──────────────────────────────────────
export const reservationApi = {
  getSlots(locationId: string, date: string, partySize: number) {
    const qs = new URLSearchParams({ locationId, date, partySize: String(partySize) });
    return apiClient<ApiResponse<TimeSlot[]>>(`/api/reservations/slots?${qs}`);
  },

  create(data: {
    locationId: string;
    date: string;
    time: string;
    partySize: number;
    comment?: string;
  }) {
    return apiClient<ApiResponse<Reservation>>('/api/reservations', {
      method: 'POST',
      body: data,
    });
  },

  getMine() {
    return apiClient<ApiResponse<Reservation[]>>('/api/reservations/mine');
  },
};

// ── Coupons ───────────────────────────────────────────
export const couponApi = {
  validate(code: string) {
    return apiClient<ApiResponse<{ id: string; type: string; value: number }>>(`/api/coupons/validate/${code}`, {
      auth: false,
    });
  },
};

// ── Loyalty ───────────────────────────────────────────
export const loyaltyApi = {
  getBalance() {
    return apiClient<ApiResponse<{ points: number }>>('/api/loyalty/balance');
  },
};

// ── Payments ──────────────────────────────────────────
export const paymentApi = {
  createIntent(orderId: string) {
    return apiClient<ApiResponse<{ clientSecret: string }>>('/api/payments/create-intent', {
      method: 'POST',
      body: { orderId },
    });
  },
};
