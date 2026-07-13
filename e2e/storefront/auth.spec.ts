import { test, expect } from '@playwright/test';

test.describe('Storefront Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('has link to register page', async ({ page }) => {
      await page.goto('/login');
      const signUpLink = page.getByRole('link', { name: 'Create one' });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await expect(page).toHaveURL('/register');
    });

    test('navigating to login from header', async ({ page }) => {
      await page.goto('/');
      await page.locator('header').getByRole('link', { name: 'Login' }).click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Register Page', () => {
    test('displays registration form', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByLabel('Full Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Phone')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('has link to login page', async ({ page }) => {
      await page.goto('/register');
      const signInLink = page.getByRole('link', { name: 'Sign in' });
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL('/login');
    });

    test('navigating to register from header', async ({ page }) => {
      await page.goto('/');
      await page.locator('header').getByRole('link', { name: 'Sign Up' }).click();
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Account Page', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/account');
      await expect(page).toHaveURL('/login');
    });
  });
});
