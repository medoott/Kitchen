import { test, expect } from '@playwright/test';

test.describe('Storefront Cart & Checkout', () => {
  test.describe('Cart', () => {
    test('cart icon visible in header', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('header').getByLabel('Open cart').first()).toBeVisible();
    });

    test('cart drawer opens when clicking cart icon', async ({ page }) => {
      await page.goto('/');
      await page.locator('header').getByLabel('Open cart').first().click();
      await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    });

    test('empty cart shows empty message', async ({ page }) => {
      await page.goto('/');
      await page.locator('header').getByLabel('Open cart').first().click();
      await expect(page.getByText('Your cart is empty')).toBeVisible();
      await expect(page.getByText('Browse Menu')).toBeVisible();
    });

    test('cart drawer closes on close button', async ({ page }) => {
      await page.goto('/');
      await page.locator('header').getByLabel('Open cart').first().click();
      await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
      await page.getByLabel('Close cart').click();
      await expect(page.getByRole('heading', { name: 'Your Cart' })).not.toBeVisible();
    });
  });

  test.describe('Checkout Page', () => {
    test('shows empty cart message when no items', async ({ page }) => {
      await page.goto('/checkout');
      await expect(page.getByText('Your cart is empty')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browse Menu' })).toBeVisible();
    });

    test('Browse Menu link on empty checkout goes to menu', async ({ page }) => {
      await page.goto('/checkout');
      await page.getByRole('link', { name: 'Browse Menu' }).click();
      await expect(page).toHaveURL(/\/menu/);
    });
  });

  test.describe('Order Confirmation', () => {
    test('shows order placed message', async ({ page }) => {
      // Navigate directly to confirm page (no actual order)
      await page.goto('/order/test-123');
      await expect(page.getByText('Order Placed!')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Order More' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
    });
  });
});
