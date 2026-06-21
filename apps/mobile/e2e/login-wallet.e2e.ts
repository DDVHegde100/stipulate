describe('Login to wallet', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('signs in with demo credentials and lands on wallet', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('login-email')).typeText('demo@stipulate.io');
    await element(by.id('login-password')).typeText('demo-password-123');
    await element(by.id('login-submit')).tap();

    await waitFor(element(by.id('wallet-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
