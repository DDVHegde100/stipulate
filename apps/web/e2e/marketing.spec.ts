import { expect, test } from '@playwright/test';

test('marketing homepage renders hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Card benefit intelligence')).toBeVisible();
});

test('login page accepts api key form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await page.getByPlaceholder('sk_live_...').fill('test_api_key_16chars');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForURL('**/dashboard');
});

test('console page loads playground', async ({ page }) => {
  await page.goto('/console');
  await expect(page.getByRole('heading', { name: /api console/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /send request/i })).toBeVisible();
});
