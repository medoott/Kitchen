import { test, expect } from './fixtures.js';

test.describe('Admin Reservation List', () => {
  test('navigates to reservations page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Reservations' }).click();
    await expect(page).toHaveURL('/reservations');
    await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  });

  test('displays status filter dropdown', async ({ page }) => {
    await page.goto('/reservations');
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toContainText('All Statuses');
    await expect(statusSelect).toContainText('Pending');
    await expect(statusSelect).toContainText('Confirmed');
  });

  test('displays date filter input', async ({ page }) => {
    await page.goto('/reservations');
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
  });

  test('shows empty state or reservation table', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForTimeout(1000);
    const noReservations = page.getByText('No reservations found.');
    const table = page.locator('table');
    const error = page.locator('.bg-red-50');
    const isVisible = await noReservations.isVisible() || await table.isVisible() || await error.isVisible();
    expect(isVisible).toBeTruthy();
  });
});

test.describe('Admin Reservation Detail', () => {
  test('shows error for non-existent reservation', async ({ page }) => {
    await page.goto('/reservations/non-existent-id');
    await page.waitForTimeout(1000);
    const backLink = page.getByText('Back to Reservations');
    const error = page.locator('.bg-red-50');
    const isVisible = await backLink.isVisible() || await error.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('back link navigates to reservation list', async ({ page }) => {
    await page.goto('/reservations/some-id');
    await page.waitForTimeout(1000);
    await page.getByText('Back to Reservations').click();
    await expect(page).toHaveURL('/reservations');
  });
});
