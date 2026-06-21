import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email, password });
      router.replace(user.onboardingComplete ? '/(tabs)/wallet' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="login-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Logo size={48} />
            <Text style={styles.title}>Welcome back</Text>
          </View>

          <GlassCard>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              testID="login-email"
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
              testID="login-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} testID="login-submit" onPress={() => void handleSubmit()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>Demo: demo@stipulate.io / demo-password-123</Text>
          </GlassCard>

          <Text style={styles.footer}>
            No account?{' '}
            <Link href="/signup" style={styles.link}>
              Sign up
            </Link>
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
  hint: { color: colors.textTertiary, fontSize: 13, marginTop: 12, textAlign: 'center' },
  footer: { color: colors.textSecondary, textAlign: 'center', fontSize: 14 },
  link: { color: colors.accentLight },
});
