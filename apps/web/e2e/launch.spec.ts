import { expect, test } from '@playwright/test';

test('status page renders health shell', async ({ page }) => {
  await page.goto('/status');
  await expect(page.getByRole('heading', { name: /stipulate platform health/i })).toBeVisible();
  await expect(page.getByText(/system status/i)).toBeVisible();
});

test('dashboard audit page renders compliance shell', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Developer' }).click();
  await page.getByPlaceholder('sk_live_...').fill('test_api_key_16chars');
  await page.getByRole('button', { name: /continue to dashboard/i }).click();
  await page.waitForURL('**/dashboard');

  await page.goto('/dashboard/audit');
  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  await expect(page.getByText(/immutable record/i)).toBeVisible();
});
