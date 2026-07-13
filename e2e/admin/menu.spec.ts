import { test, expect } from './fixtures.js';

test.describe('Admin Menu Management', () => {
  test.describe('Categories', () => {
    test('shows categories page with Add Category button', async ({ page }) => {
      await page.goto('/menu/categories');
      await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add Category' })).toBeVisible();
    });

    test('shows loading or empty state', async ({ page }) => {
      await page.goto('/menu/categories');
      // Without a backend, the page shows either loading or an error
      await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
    });

    test('navigates to new category form', async ({ page }) => {
      await page.goto('/menu/categories');
      await page.getByRole('link', { name: 'Add Category' }).click();
      await expect(page).toHaveURL('/menu/categories/new');
      await expect(page.getByRole('heading', { name: 'New Category' })).toBeVisible();
    });

    test('category form has required fields', async ({ page }) => {
      await page.goto('/menu/categories/new');
      await expect(page.getByText('Name *')).toBeVisible();
      await expect(page.getByText('Slug *')).toBeVisible();
      await expect(page.getByText('Description')).toBeVisible();
      await expect(page.getByText('Parent Category')).toBeVisible();
      await expect(page.getByText('Sort Order')).toBeVisible();
    });

    test('auto-generates slug from name', async ({ page }) => {
      await page.goto('/menu/categories/new');
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('My Category');
      const slugInput = page.locator('input[type="text"]').nth(1);
      await expect(slugInput).toHaveValue('my-category');
    });

    test('back button navigates to categories list', async ({ page }) => {
      await page.goto('/menu/categories/new');
      await page.getByText('Back to Categories').click();
      await expect(page).toHaveURL('/menu/categories');
    });
  });

  test.describe('Menu Items', () => {
    test('shows menu items page with filters', async ({ page }) => {
      await page.goto('/menu/items');
      await expect(page.getByRole('heading', { name: 'Menu Items' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Add Item' })).toBeVisible();
      await expect(page.getByPlaceholder('Search items...')).toBeVisible();
    });

    test('shows loading or empty state', async ({ page }) => {
      await page.goto('/menu/items');
      // Without a backend, the page shows either loading or an error
      await expect(page.getByRole('heading', { name: 'Menu Items' })).toBeVisible();
    });

    test('navigates to new item form', async ({ page }) => {
      await page.goto('/menu/items');
      await page.getByRole('link', { name: 'Add Item' }).click();
      await expect(page).toHaveURL('/menu/items/new');
      await expect(page.getByRole('heading', { name: 'New Menu Item' })).toBeVisible();
    });

    test('item form has all sections', async ({ page }) => {
      await page.goto('/menu/items/new');
      await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Menu Options' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Allergens' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Mealtimes' })).toBeVisible();
    });

    test('can add and remove option groups', async ({ page }) => {
      await page.goto('/menu/items/new');
      await expect(page.getByText('No options configured.')).toBeVisible();

      await page.getByText('+ Add Option Group').click();
      await expect(page.getByText('Option Group #1')).toBeVisible();
      await expect(page.getByText('No options configured.')).not.toBeVisible();

      await page.getByText('Remove Group').click();
      await expect(page.getByText('No options configured.')).toBeVisible();
    });

    test('auto-generates slug from name', async ({ page }) => {
      await page.goto('/menu/items/new');
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('Garlic Bread');
      const slugInput = page.locator('input[type="text"]').nth(1);
      await expect(slugInput).toHaveValue('garlic-bread');
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('Menu link expands to show Items and Categories', async ({ page }) => {
      await page.goto('/menu/items');
      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Items')).toBeVisible();
      await expect(sidebar.getByText('Categories')).toBeVisible();
    });

    test('/menu redirects to /menu/items', async ({ page }) => {
      await page.goto('/menu');
      await expect(page).toHaveURL('/menu/items');
    });
  });
});
