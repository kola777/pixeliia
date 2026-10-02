import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, space } from '@/constants/theme';
import { isSupabaseConfigured, upgradeWithEmail } from '@/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { needsConfirmation } = await upgradeWithEmail(email, password, mode);
      if (needsConfirmation) {
        setNotice('Account created. Check your inbox to confirm your email, then sign in.');
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen>
        <View style={styles.wrap}>
          <Text style={styles.headline}>Sign in</Text>
          <Text style={styles.lede}>
            The backend is not connected yet, so accounts stay in local mode for now.
          </Text>
          <PrimaryButton label="Back" onPress={() => router.back()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.headline}>{mode === 'signup' ? 'Back up your account' : 'Welcome back'}</Text>
        <Text style={styles.lede}>
          {mode === 'signup'
            ? 'Add an email to keep your edits and ESPEE safe across devices. Your guest work carries over.'
            : 'Sign in to the email you used before.'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <PrimaryButton
          label={busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          onPress={submit}
        />

        <Pressable
          disabled={busy}
          onPress={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError(null);
            setNotice(null);
          }}
          style={styles.switch}
          accessibilityRole="button">
          <Text style={styles.switchLabel}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: space.xl,
    gap: space.sm,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  lede: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: space.sm,
  },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginTop: space.sm,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
  notice: {
    color: colors.success,
    fontWeight: '600',
  },
  switch: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
});
