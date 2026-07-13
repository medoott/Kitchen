import { test, expect } from '@playwright/test';

test.describe('Storefront Reservations Page', () => {
  test('displays reservations page heading', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.getByRole('heading', { name: 'Table Reservations' })).toBeVisible();
  });

  test('displays booking form', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.getByRole('heading', { name: 'Book a Table' })).toBeVisible();
  });

  test('displays location selector', async ({ page }) => {
    await page.goto('/reservations');
    const locationSelect = page.getByRole('main').locator('select').first();
    await expect(locationSelect).toBeVisible();
    await expect(locationSelect).toContainText('Select Location');
  });

  test('displays party size selector', async ({ page }) => {
    await page.goto('/reservations');
    const partySizeSelect = page.getByRole('main').locator('select').nth(1);
    await expect(partySizeSelect).toBeVisible();
    await expect(partySizeSelect).toContainText('2 guests');
  });

  test('displays date picker', async ({ page }) => {
    await page.goto('/reservations');
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
  });

  test('shows login prompt when not authenticated', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.getByRole('main').getByRole('link', { name: 'Login' })).toBeVisible();
  });

  test('shows my reservations section', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.getByRole('heading', { name: 'My Reservations' })).toBeVisible();
  });

  test('has special requests textarea', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('book table button is disabled without login', async ({ page }) => {
    await page.goto('/reservations');
    const bookBtn = page.getByRole('button', { name: 'Book Table' });
    await expect(bookBtn).toBeVisible();
    await expect(bookBtn).toBeDisabled();
  });
});
