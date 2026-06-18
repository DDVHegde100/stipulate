import { useCallback, useState } from 'react';

import { enrichMerchant } from '@/lib/stipulate';

export interface EnrichResult {
  merchantName: string;
  category: string;
  mcc?: string;
  confidence: number;
}

export function useEnrich() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrich = useCallback(async (input: { merchantName: string; mcc?: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await enrichMerchant(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enrich failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enrich, loading, error };
}
