import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdSlot } from '@/components/AdSlot';
import { AppScreen } from '@/components/AppScreen';
import { colors, radius, space } from '@/constants/theme';

const ROWS = [
  { title: 'Account', body: 'Sign-in arrives with Supabase in the next pass.' },
  { title: 'Purchases', body: 'ESPEE exports will show up here.' },
  { title: 'Privacy', body: 'Photos are not used for model training without consent.' },
  { title: 'Help', body: 'One-click editing, natural results, ads that stay out of the way.' },
];

export default function ProfileScreen() {
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Profile</Text>
        {ROWS.map((row) => (
          <View key={row.title} style={styles.card}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.body}>{row.body}</Text>
          </View>
        ))}
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
});
