import { test, expect } from '@playwright/test';

test.describe('Storefront Payment', () => {
  // Checkout page (with empty cart) shows empty state, so we just test the
  // checkout page renders correctly structurally. The payment method UI
  // requires items in the cart, which needs API mocking for full test.

  test('checkout page shows empty cart message', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('checkout page has Browse Menu link', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByRole('link', { name: 'Browse Menu' })).toBeVisible();
  });

  test('order confirmation page shows success', async ({ page }) => {
    await page.goto('/order/test-id');
    await expect(page.getByText('Order Placed!')).toBeVisible();
    await expect(page.getByText('Thank you for your order')).toBeVisible();
  });

  test('order confirmation has navigation links', async ({ page }) => {
    await page.goto('/order/test-id');
    await expect(page.getByRole('link', { name: 'Order More' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
  });

  test('order more link goes to menu', async ({ page }) => {
    await page.goto('/order/test-id');
    await page.getByRole('link', { name: 'Order More' }).click();
    await expect(page).toHaveURL(/\/menu/);
  });
});
