import { expect, test } from '@playwright/test';

const E2E_USER = {
  id: 'e2e-test-user',
  email: 'e2e@stipulate.io',
  name: 'E2E User',
  timezone: 'UTC',
  onboardingComplete: true,
  walletCardIds: [],
  notificationPrefs: { email: true, push: false },
};

async function seedConsumerSession(page: import('@playwright/test').Page) {
  await page.context().addCookies([
    {
      name: 'stipulate_user_id',
      value: E2E_USER.id,
      url: 'http://localhost:3001',
    },
  ]);
  await page.addInitScript((user) => {
    localStorage.setItem('stipulate_user', JSON.stringify(user));
  }, E2E_USER);
}

test('middleware redirects unauthenticated app routes to login', async ({ page }) => {
  await page.goto('/app/wallet');
  await page.waitForURL('**/login?redirect=%2Fapp%2Fwallet');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('middleware redirects unauthenticated onboarding to login', async ({ page }) => {
  await page.goto('/onboarding');
  await page.waitForURL('**/login?redirect=%2Fonboarding');
});

test('authenticated wallet page renders', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/wallet');
  await expect(page.getByRole('heading', { name: /linked/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wallet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
});

test('authenticated settings page renders profile form', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  await expect(page.getByText(/push alerts/i)).toBeVisible();
});

test('authenticated discover page renders gaps', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/discover');
  await expect(page.getByRole('heading', { name: /unlock better cards/i })).toBeVisible();
});

test('route page renders purchase form', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/route');
  await expect(page.getByRole('heading', { name: /which card/i })).toBeVisible();
});

test('batch route page renders sample spend shell', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/batch');
  await expect(page.getByRole('heading', { name: /multiple purchases/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /run batch route/i })).toBeVisible();
});

test('settings page shows billing and privacy sections', async ({ page }) => {
  await seedConsumerSession(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: /^Settings$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Billing$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Privacy$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /download my data/i })).toBeVisible();
});
