import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';

export function AdSlot({ label = 'Sponsored' }: { label?: string }) {
  return (
    <View style={styles.slot} accessibilityRole="summary" accessibilityLabel="Standard ad slot">
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>Reserved ad space · never interrupts editing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
