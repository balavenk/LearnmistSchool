import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('Super Admin can log in successfully', async ({ page }) => {
        // 1. Navigate to the App (will auto-redirect to /login if unauthenticated)
        await page.goto('/');

        // Verify we are on the login page
        await expect(page).toHaveURL(/.*\/login/);

        // 2. Fill in the Credentials
        // Looking at Login.tsx, the inputs have placeholder labels but aren't heavily id'd
        // We'll target them by placeholder for robustness
        await page.getByPlaceholder('Enter your username').fill('superadmin');
        await page.getByPlaceholder('••••••••').fill('password123');

        // 3. Click the Submit button
        await page.getByRole('button', { name: 'Sign in' }).click();

        // 4. Assert Successful Navigation to Super Admin Dashboard
        // Give it time to hit the API, get the token, and route.
        await expect(page).toHaveURL(/.*\/super-admin/);

        // 5. Assert Dashboard Loaded
        await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
    });

    test('Login fails with invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder('Enter your username').fill('wronguser');
        await page.getByPlaceholder('••••••••').fill('wrongpass');

        await page.getByRole('button', { name: 'Sign in' }).click();

        // Assert that a toast error appears
        await expect(page.locator('.go3958317564')).toBeVisible(); // react-hot-toast class

        // Assert we stay on login page
        await expect(page).toHaveURL(/.*\/login/);
    });
});
