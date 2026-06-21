describe('Onboarding push opt-in', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('completes onboarding with push alerts enabled', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.text('Sign up')).tap();

    const email = `e2e-${Date.now()}@stipulate.io`;
    await element(by.id('signup-email')).typeText(email);
    await element(by.id('signup-password')).typeText('demo-password-123');
    await element(by.id('signup-submit')).tap();

    await waitFor(element(by.id('onboarding-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.text('Get started')).tap();
    await element(by.text('Add')).atIndex(0).tap();
    await element(by.text('Continue')).tap();
    await element(by.id('onboarding-finish')).tap();

    await waitFor(element(by.id('wallet-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
