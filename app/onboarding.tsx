import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, space } from '@/constants/theme';
import { track } from '@/lib/analytics';

const ONBOARDED_KEY = 'pixeliia:onboarded:v1';

const POINTS = [
  'Tap a tool. No prompt writing.',
  'Edits stay natural and identity-preserving.',
  'Free editing. Ads never interrupt.',
  'Standard export is free with a small watermark. HD and clean exports use ESPEE.',
];

export default function OnboardingScreen() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((seen) => {
        if (seen === '1') {
          router.replace('/(tabs)');
        }
      })
      .catch(() => {});
  }, [router]);

  async function getStarted() {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      // Storage unavailable: still let the user continue.
    }
    track('onboarding_completed');
    router.replace('/(tabs)');
  }

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Logo />
        <Text style={styles.headline}>Photo editing as simple as choosing a button.</Text>
        <View style={styles.list}>
          {POINTS.map((point) => (
            <Text key={point} style={styles.point}>
              {point}
            </Text>
          ))}
        </View>
        <PrimaryButton label="Get started" onPress={getStarted} />
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
