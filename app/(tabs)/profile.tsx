import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { AdSlot } from '@/components/AdSlot';
import { AppScreen } from '@/components/AppScreen';
import { colors, radius, space } from '@/constants/theme';
import { useEditor } from '@/context/EditorContext';
import {
  getAccountInfo,
  isSupabaseConfigured,
  signOutAccount,
  type AccountInfo,
} from '@/lib/supabase';

const ROWS = [
  { title: 'Account', body: 'Sign-in arrives with Supabase in the next pass.' },
  { title: 'Purchases', body: 'ESPEE exports will show up here.' },
  { title: 'Privacy', body: 'Photos are not used for model training without consent.' },
  { title: 'Help', body: 'One-click editing, natural results, ads that stay out of the way.' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { balance, ledger } = useEditor();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const reloadAccount = useCallback(() => {
    setAccountLoading(true);
    getAccountInfo()
      .then(setAccount)
      .catch(() => {})
      .finally(() => setAccountLoading(false));
  }, []);

  useFocusEffect(reloadAccount);

  function confirmSignOut() {
    const guest = !account?.email;
    Alert.alert(
      'Sign out?',
      guest
        ? 'Guest identities cannot be recovered. Your private jobs stay on the server but this device loses access to them.'
        : 'You can sign back in anytime with your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            signOutAccount()
              .then(reloadAccount)
              .catch(() => {});
          },
        },
      ]
    );
  }

  const accountBody = !isSupabaseConfigured()
    ? 'Local mode. Sign-in activates with the Supabase backend.'
    : accountLoading
      ? 'Signing in…'
      : account?.email
        ? `${account.email}${account.emailConfirmed ? '' : ' (unconfirmed — check your inbox)'}`
        : account
          ? `Guest account ${account.id.slice(0, 8)}. Jobs and photos stay private to this device.`
          : 'Not signed in.';

  const rows = [
    {
      title: 'Account',
      body: accountBody,
    },
    {
      title: 'Backend',
      body: isSupabaseConfigured()
        ? 'Connected. Edits run on the AI backend.'
        : 'Not connected yet. The app runs in local preview mode.',
    },
    {
      title: 'Purchases',
      body: `Balance: ${balance} ESPEE. Export purchases appear below.`,
    },
    ...ROWS.slice(2),
  ];
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Profile</Text>
        {rows.map((row) =>
          row.title === 'Privacy' ? (
            <Pressable
              key={row.title}
              accessibilityRole="button"
              accessibilityLabel="Read the full privacy notice"
              onPress={() => router.push('/privacy')}
              style={styles.card}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={styles.body}>{row.body}</Text>
              <Text style={styles.linkLabel}>Read full notice →</Text>
            </Pressable>
          ) : (
            <View key={row.title} style={styles.card}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={styles.body}>{row.body}</Text>
            </View>
          )
        )}
        {isSupabaseConfigured() && account && !account.email ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth')}
            style={styles.link}>
            <Text style={styles.linkLabel}>Back up with email →</Text>
          </Pressable>
        ) : null}
        {isSupabaseConfigured() && account ? (
          <Pressable
            accessibilityRole="button"
            onPress={confirmSignOut}
            style={styles.link}>
            <Text style={styles.linkLabel}>Sign out</Text>
          </Pressable>
        ) : null}
        {ledger.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.title}>Recent activity</Text>
            {ledger.slice(0, 5).map((entry) => (
              <Text key={entry.id} style={styles.body}>
                {entry.label} ({entry.delta > 0 ? '+' : ''}
                {entry.delta} ESPEE)
              </Text>
            ))}
          </View>
        ) : null}
        <AdSlot />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: space.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
});
