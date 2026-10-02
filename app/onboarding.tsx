import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, space } from '@/constants/theme';

const POINTS = [
  'Tap a tool. No prompt writing.',
  'Edits stay natural and identity-preserving.',
  'Free editing. Ads never interrupt.',
];

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.wordmark}>Pixeliia</Text>
        <Text style={styles.headline}>Photo editing as simple as choosing a button.</Text>
        <View style={styles.list}>
          {POINTS.map((point) => (
            <Text key={point} style={styles.point}>
              {point}
            </Text>
          ))}
        </View>
        <PrimaryButton label="Get started" onPress={() => router.replace('/(tabs)')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: space.xl,
    gap: space.lg,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    gap: space.sm,
    marginBottom: space.md,
  },
  point: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
