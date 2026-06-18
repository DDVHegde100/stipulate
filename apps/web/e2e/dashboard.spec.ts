import { expect, test } from '@playwright/test';

test('dashboard usage page renders metrics shell', async ({ page }) => {
  await page.goto('/dashboard/usage');
  await expect(page.getByRole('heading', { name: /^usage$/i })).toBeVisible();
});

test('admin console home renders links', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /admin console/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /ingestion queue/i })).toBeVisible();
});
