import { test as base } from '@playwright/test';

/**
 * Admin test fixture that logs in before each test by setting a token in localStorage.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Login via API to get a valid token
    const res = await page.request.post('http://127.0.0.1:3000/api/auth/staff/login', {
      data: { email: 'admin@kitchenasty.com', password: 'admin123' },
    });
    const body = await res.json();
    const token = body.data?.token;

    if (token) {
      // Set token in localStorage and reload so the app picks it up
      await page.goto('/');
      await page.evaluate((t) => localStorage.setItem('token', t), token);
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
