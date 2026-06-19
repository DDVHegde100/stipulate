import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MccChip } from '@/components/MccChip';
import { colors } from '@/theme/colors';

export interface PurchaseInput {
  merchantName: string;
  mcc: string;
  amountMinor: number;
}

const MCC_PRESETS = [
  { label: 'Coffee', mcc: '5814', merchant: 'Starbucks' },
  { label: 'Restaurant', mcc: '5812', merchant: 'Local Bistro' },
  { label: 'Grocery', mcc: '5411', merchant: 'Whole Foods' },
  { label: 'Gas', mcc: '5541', merchant: 'Shell' },
  { label: 'Airline', mcc: '4511', merchant: 'United Airlines' },
] as const;

interface PurchaseFormProps {
  initial?: PurchaseInput;
  onSubmit: (purchase: PurchaseInput) => void;
}

export function PurchaseForm({ initial, onSubmit }: PurchaseFormProps) {
  const [merchantName, setMerchantName] = useState(initial?.merchantName ?? 'Starbucks');
  const [mcc, setMcc] = useState(initial?.mcc ?? '5814');
  const [amount, setAmount] = useState(String((initial?.amountMinor ?? 650) / 100));

  function applyPreset(preset: (typeof MCC_PRESETS)[number]) {
    setMerchantName(preset.merchant);
    setMcc(preset.mcc);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quick presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {MCC_PRESETS.map((preset) => (
          <MccChip
            key={preset.mcc}
            label={preset.label}
            active={mcc === preset.mcc}
            onPress={() => applyPreset(preset)}
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Merchant</Text>
      <TextInput
        style={styles.input}
        value={merchantName}
        onChangeText={setMerchantName}
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>MCC</Text>
      <TextInput
        style={styles.input}
        value={mcc}
        onChangeText={setMcc}
        keyboardType="number-pad"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Amount (USD)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textSecondary}
      />

      <Pressable
        style={styles.button}
        onPress={() =>
          onSubmit({
            merchantName,
            mcc,
            amountMinor: Math.round(parseFloat(amount || '0') * 100),
          })
        }
      >
        <Text style={styles.buttonText}>Route this purchase</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  chips: { gap: 8, paddingBottom: 4 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
