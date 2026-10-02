import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { EXPORT_OPTIONS } from '@/constants/exportOptions';
import { colors, radius, space } from '@/constants/theme';
import { toolById } from '@/constants/tools';
import { useEditor } from '@/context/EditorContext';

export default function ExportScreen() {
  const router = useRouter();
  const { toolId } = useLocalSearchParams<{ toolId?: string }>();
  const tool = toolById(toolId ?? '');
  const { photoUri, saveProject } = useEditor();

  function choose(optionId: string, enabled: boolean) {
    if (!enabled) {
      Alert.alert('Coming later', 'This export option is planned for a later release.');
      return;
    }
    if (!photoUri) {
      Alert.alert('No photo', 'Select a photo before exporting.');
      return;
    }
    if (tool) {
      saveProject(tool.id, tool.name);
    }
    Alert.alert(
      'Saved to My Photos',
      optionId === 'standard'
        ? 'Standard download is free and includes the Pixeliia watermark.'
        : 'Purchase flow will use ESPEE once billing is connected.'
    );
    router.push('/(tabs)/photos');
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Export</Text>
        <Text style={styles.lede}>
          Ads never gate this step. Prices can change later without redesigning the editor.
        </Text>

        {EXPORT_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !option.mvp }}
            onPress={() => choose(option.id, option.mvp)}
            style={[styles.card, !option.mvp && styles.disabled]}>
            <View style={styles.row}>
              <Text style={styles.name}>{option.name}</Text>
              <Text style={styles.price}>{option.priceLabel}</Text>
            </View>
            <Text style={styles.hint}>{option.hint}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.sm,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  lede: {
    color: colors.textMuted,
    marginBottom: space.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    minHeight: 72,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: 4,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  price: {
    fontWeight: '700',
    color: colors.accent,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
