import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { colors } from '@/theme/colors';

interface ReceiptOcrPanelProps {
  onParsed: (input: { merchantName: string; mcc?: string; amountMinor?: number }) => void;
}

export function ReceiptOcrPanel({ onParsed }: ReceiptOcrPanelProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1'}/enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.EXPO_PUBLIC_API_KEY ?? 'stip_dev_local_key_change_in_production',
          },
          body: JSON.stringify({ receiptOcrText: text }),
        },
      );
      const json = (await response.json()) as {
        data: { enrichment: { merchantName: string; mcc?: string } };
        error?: { message: string };
      };
      if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);

      const enrichment = json.data.enrichment;
      onParsed({
        merchantName: enrichment.merchantName,
        mcc: enrichment.mcc,
      });
      setOpen(false);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt parse failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={styles.toggle}>{open ? 'Hide receipt OCR' : 'Paste receipt text (OCR)'}</Text>
      </Pressable>
      {open && (
        <View style={styles.panel}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Paste OCR text from a receipt photo…"
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
          />
          <Pressable style={styles.button} onPress={() => void handleParse()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Extract merchant</Text>
            )}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { color: colors.accentLight, fontSize: 14, marginBottom: 12 },
  panel: { gap: 10, marginBottom: 12 },
  input: {
    minHeight: 100,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#f87171', fontSize: 13 },
});
