/** Production API URL guard — warns when mobile points at localhost in release builds. */
export function assertProductionApiUrl(apiUrl: string): void {
  if (!__DEV__) {
    const lowered = apiUrl.toLowerCase();
    if (
      lowered.includes('localhost') ||
      lowered.includes('127.0.0.1') ||
      lowered.includes('stip_dev_local')
    ) {
      console.error(
        '[stipulate] EXPO_PUBLIC_API_URL must point to production in release builds',
      );
    }
  }
}
