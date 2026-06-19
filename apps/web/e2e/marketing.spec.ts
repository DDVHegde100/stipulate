import { expect, test } from '@playwright/test';

test('marketing homepage renders hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Card benefit intelligence')).toBeVisible();
  await expect(page.getByText('200+')).toBeVisible();
});

test('pricing page renders tiers', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: /pay for what you route/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SaaS' })).toBeVisible();
});

test('signup page renders form', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
});

test('login page accepts api key form', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Developer' }).click();
  await expect(page.getByRole('heading', { name: /sign in with api key/i })).toBeVisible();
  await page.getByPlaceholder('sk_live_...').fill('test_api_key_16chars');
  await page.getByRole('button', { name: /continue to dashboard/i }).click();
  await page.waitForURL('**/dashboard');
});

test('console page loads playground', async ({ page }) => {
  await page.goto('/console');
  await expect(page.getByRole('heading', { name: /api console/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /send request/i })).toBeVisible();
});

test('console API reference tab renders endpoints', async ({ page }) => {
  await page.goto('/console');
  await page.getByRole('button', { name: 'API reference' }).click();
  await expect(page.getByRole('heading', { name: /openapi 3.1/i })).toBeVisible();
  await expect(page.getByText('/v1/route')).toBeVisible();
  await expect(page.getByText('/v1/route/batch')).toBeVisible();
});

test('docs page renders API reference heading', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: /api reference/i })).toBeVisible();
});
