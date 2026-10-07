import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { colors, radius, space } from '@/constants/theme';

const SECTIONS = [
  {
    title: 'Your photos',
    body: 'Photos you edit are uploaded over an encrypted connection to run the AI edit, then stored privately so you can revisit results. They are never used to train models without your explicit consent.',
  },
  {
    title: 'Your account',
    body: 'The app signs you in as an anonymous guest, so there is no name or email attached to your edits unless you choose to add an email backup. Every edit job and photo is visible only to your account.',
  },
  {
    title: 'Payments',
    body: 'Premium exports use ESPEE credits tracked in a purchase ledger. Real billing is connected separately; test credits are always labeled as tests.',
  },
  {
    title: 'Advertising',
    body: 'The app records anonymous ad displays and taps to measure campaigns. An edit itself is never counted as an ad view.',
  },
  {
    title: 'AI edits',
    body: 'Photos altered by AI — age, appearance, body, outfit, and background changes — are labeled as generated edits inside the app.',
  },
  {
    title: 'Your control',
    body: 'Signing out removes this device\u2019s access to its guest account. To delete stored photos and history, remove the account data from within the app\u2019s settings once account management is enabled.',
  },
];

export default function PrivacyScreen() {
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Privacy</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
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
