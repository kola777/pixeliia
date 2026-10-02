import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Tool } from '@/constants/tools';
import { colors, radius, space } from '@/constants/theme';

export function ToolCard({
  tool,
  onPress,
}: {
  tool: Tool;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tool.name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.dot} />
      <Text style={styles.name}>{tool.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {tool.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.72,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginBottom: space.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
