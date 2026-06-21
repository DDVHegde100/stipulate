describe('Wallet bank link stub', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('connects bank in stub mode from wallet tab', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('login-email')).typeText('demo@stipulate.io');
    await element(by.id('login-password')).typeText('demo-password-123');
    await element(by.id('login-submit')).tap();

    await waitFor(element(by.id('wallet-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id('plaid-connect-button')).tap();

    await waitFor(element(by.text(/linked/i)))
      .toBeVisible()
      .withTimeout(10000);
  });
});
