import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { create, dismissLink, open, type LinkSuccess } from 'react-native-plaid-link-sdk';

import { colors } from '@/theme/colors';
import {
  connectBankStub,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
} from '@/lib/plaid';

interface PlaidConnectButtonProps {
  consumerUserId: string;
  onLinked: (result: {
    accountsLinked: number;
    suggestedCards: Array<{ accountName: string; cardId: string }>;
  }) => void;
  onError: (message: string) => void;
}

export function PlaidConnectButton({ consumerUserId, onLinked, onError }: PlaidConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const finishLink = useCallback(
    async (publicToken: string, institutionName?: string) => {
      try {
        const result = await exchangePlaidPublicToken({
          consumerUserId,
          publicToken,
          institutionName,
        });
        onLinked(result);
      } catch {
        onError('Bank linking failed. Try again later.');
      } finally {
        setLoading(false);
        setLinkToken(null);
        dismissLink();
      }
    },
    [consumerUserId, onError, onLinked],
  );

  useEffect(() => {
    if (!linkToken) return;

    void create({ token: linkToken });
    open({
      onSuccess: (success: LinkSuccess) => {
        void finishLink(success.publicToken, success.metadata.institution?.name);
      },
      onExit: () => {
        setLoading(false);
        setLinkToken(null);
      },
    });
  }, [finishLink, linkToken]);

  async function handlePress() {
    setLoading(true);
    try {
      const link = await createPlaidLinkToken(consumerUserId);
      if (link.mode === 'stub') {
        const result = await connectBankStub(consumerUserId);
        onLinked(result);
        setLoading(false);
        return;
      }

      setLinkToken(link.linkToken);
    } catch {
      onError('Bank linking failed. Try again later.');
      setLoading(false);
    }
  }

  return (
    <Pressable style={styles.button} onPress={() => void handlePress()} disabled={loading}>
      <Text style={styles.text}>{loading ? 'Connecting…' : 'Connect bank account'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: { color: colors.background, fontWeight: '700' },
});
