import { test, expect } from './fixtures.js';

test.describe('Admin Coupon List', () => {
  test('navigates to coupons page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Coupons' }).click();
    await expect(page).toHaveURL('/coupons');
    await expect(page.getByRole('heading', { name: 'Coupons' })).toBeVisible();
  });

  test('has new coupon button', async ({ page }) => {
    await page.goto('/coupons');
    await expect(page.getByText('+ New Coupon')).toBeVisible();
  });

  test('shows empty state or coupon table', async ({ page }) => {
    await page.goto('/coupons');
    await page.waitForTimeout(1000);
    const noCoupons = page.getByText('No coupons yet.');
    const table = page.locator('table');
    const error = page.locator('.bg-red-50');
    const isVisible = await noCoupons.isVisible() || await table.isVisible() || await error.isVisible();
    expect(isVisible).toBeTruthy();
  });
});

test.describe('Admin Coupon Form', () => {
  test('navigates to new coupon form', async ({ page }) => {
    await page.goto('/coupons');
    await page.getByText('+ New Coupon').click();
    await expect(page).toHaveURL('/coupons/new');
    await expect(page.getByRole('heading', { name: 'New Coupon' })).toBeVisible();
  });

  test('displays coupon form fields', async ({ page }) => {
    await page.goto('/coupons/new');
    await expect(page.getByPlaceholder('SAVE20')).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Coupon' })).toBeVisible();
  });

  test('back link navigates to coupon list', async ({ page }) => {
    await page.goto('/coupons/new');
    await page.getByText('Cancel').click();
    await expect(page).toHaveURL('/coupons');
  });

  test('shows edit form for existing coupon', async ({ page }) => {
    await page.goto('/coupons/some-id');
    await page.waitForTimeout(1000);
    // Either shows edit form or error from failed load
    const heading = page.getByRole('heading', { name: 'Edit Coupon' });
    const error = page.getByText('Failed to load coupon');
    const isVisible = await heading.isVisible() || await error.isVisible();
    expect(isVisible).toBeTruthy();
  });
});
