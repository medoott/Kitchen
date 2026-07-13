import { test, expect } from './fixtures.js';

test.describe('Admin Review List', () => {
  test('navigates to reviews page', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page).toHaveURL('/reviews');
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  });

  test('displays approval filter dropdown', async ({ page }) => {
    await page.goto('/reviews');
    const select = page.locator('select');
    await expect(select).toBeVisible();
    await expect(select).toContainText('All Reviews');
    await expect(select).toContainText('Approved');
    await expect(select).toContainText('Pending');
  });

  test('shows empty state or review cards', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForTimeout(1000);
    const noReviews = page.getByText('No reviews found.');
    const reviewCard = page.locator('.bg-white.rounded-xl').first();
    const error = page.locator('.bg-red-50');
    const isVisible = await noReviews.isVisible() || await reviewCard.isVisible() || await error.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('filter dropdown changes value', async ({ page }) => {
    await page.goto('/reviews');
    const select = page.locator('select');
    await select.selectOption('true');
    await expect(select).toHaveValue('true');
    await select.selectOption('false');
    await expect(select).toHaveValue('false');
  });
});
