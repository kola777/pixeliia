import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

/**
 * Pixeliia brand lockup: lens-aperture mark plus two-tone wordmark.
 * Pure views and text — crisp at any size, no image assets needed.
 */
export function Logo() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Pixeliia">
      <View style={styles.mark}>
        <View style={styles.ring}>
          <View style={styles.dot} />
        </View>
      </View>
      <Text style={styles.word}>
        Pixel<Text style={styles.accent}>iia</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
  },
  word: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  accent: {
    color: colors.accent,
  },
});
