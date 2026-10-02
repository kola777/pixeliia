import type { Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

/**
 * The exact pixels Standard/HD exports are captured from (see export.tsx).
 * `collapsable={false}` is required on Android or view-shot captures blank.
 */
export function WatermarkedPhoto({
  uri,
  width,
  height,
  viewRef,
}: {
  uri: string;
  width: number;
  height: number;
  viewRef: Ref<View>;
}) {
  return (
    <View ref={viewRef} collapsable={false} style={[styles.frame, { width, height }]}>
      <Image source={{ uri }} style={{ width, height }} accessibilityLabel="Export preview" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Pixeliia</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(22, 22, 22, 0.62)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
