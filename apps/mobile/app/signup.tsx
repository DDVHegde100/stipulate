import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function SignupScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const user = await signup({ email, password, name: name || undefined });
      router.replace(user.onboardingComplete ? '/(tabs)/wallet' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Logo size={48} />
            <Text style={styles.title}>Create your account</Text>
          </View>

          <GlassCard>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              testID="signup-email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@company.com"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              testID="signup-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min 8 characters"
              placeholderTextColor={colors.textTertiary}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} testID="signup-submit" onPress={() => void handleSubmit()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </Pressable>
          </GlassCard>

          <Text style={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>
              Sign in
            </Link>
          </Text>
          <Text style={styles.legal}>
            By creating an account you agree to our{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL('https://stipulate.io/terms')}>
              Terms
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL('https://stipulate.io/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 24, gap: 20, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#f87171', marginTop: 10, fontSize: 14 },
  footer: { color: colors.textSecondary, textAlign: 'center', fontSize: 14 },
  legal: { color: colors.textTertiary, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  link: { color: colors.accentLight },
});
