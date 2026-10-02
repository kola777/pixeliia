import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';

export function Billboard() {
  return (
    <View style={styles.slot} accessibilityRole="summary" accessibilityLabel="Premium home billboard">
      <Text style={styles.kicker}>Premium billboard · hourly booking</Text>
      <Text style={styles.title}>Your brand, this hour</Text>
      <Text style={styles.body}>Exclusive home placement. No pop-ups, never covers the editor.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 148,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: space.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD9FF',
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
