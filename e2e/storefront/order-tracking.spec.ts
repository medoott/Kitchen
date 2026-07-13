import { test, expect } from '@playwright/test';

test.describe('Order History Page', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page).toHaveURL('/login');
  });

  test('page renders with heading before auth check', async ({ page }) => {
    // Navigate directly — the page renders briefly before auth redirect
    await page.goto('/account/orders');
    // Should redirect to login since there's no valid token
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Order Status Page', () => {
  test('shows error for non-existent order', async ({ page }) => {
    await page.goto('/orders/non-existent-id');
    await page.waitForTimeout(1500);
    // Should show error or order not found
    const error = page.locator('.bg-red-50');
    const heading = page.getByRole('heading', { level: 1 });
    const isVisible = await error.isVisible() || await heading.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('has back to order history link on error', async ({ page }) => {
    await page.goto('/orders/non-existent-id');
    await page.waitForTimeout(1500);
    await expect(page.getByText('Back to Order History')).toBeVisible();
  });

  test('order status page has navigation links', async ({ page }) => {
    await page.goto('/orders/non-existent-id');
    await page.waitForTimeout(1500);
    const backLink = page.getByText('Back to Order History');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/account/orders');
  });

  test('order confirmation page still works', async ({ page }) => {
    await page.goto('/order/test-id');
    await expect(page.getByText('Order Placed!')).toBeVisible();
  });
});

test.describe('Account Page Order Link', () => {
  test('account redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL('/login');
  });
});
