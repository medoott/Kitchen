import { test, expect } from '@playwright/test';

test.describe('Storefront Navigation', () => {
  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/some-unknown-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
  });

  test('back to home from 404 page', async ({ page }) => {
    await page.goto('/some-unknown-page');
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('header is sticky and visible on scroll', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('position', 'sticky');
  });

  test('footer is visible at bottom of page', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(new Date().getFullYear().toString());
  });
});
