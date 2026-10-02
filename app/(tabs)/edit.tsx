import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdSlot } from '@/components/AdSlot';
import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CATEGORIES, toolsInCategory } from '@/constants/tools';
import { colors, radius, space } from '@/constants/theme';
import { useEditor } from '@/context/EditorContext';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '@/lib/pickPhoto';

export default function EditScreen() {
  const router = useRouter();
  const { photoUri, setPhoto } = useEditor();

  async function chooseLibrary() {
    const uri = await pickPhotoFromLibrary();
    if (uri) setPhoto(uri);
  }

  async function chooseCamera() {
    const uri = await takePhotoWithCamera();
    if (uri) setPhoto(uri);
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Select a photo, then tap a tool.</Text>

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Selected photo" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>No photo yet</Text>
            <Text style={styles.placeholderBody}>Your image stays the focus of every screen.</Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <PrimaryButton label="Choose photo" onPress={chooseLibrary} />
          </View>
          <View style={styles.rowItem}>
            <Pressable onPress={chooseCamera} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryLabel}>Take photo</Text>
            </Pressable>
          </View>
        </View>

        {CATEGORIES.map((category) => (
          <View key={category.id} style={styles.block}>
            <Text style={styles.category}>{category.name}</Text>
            <Text style={styles.blurb}>{category.blurb}</Text>
            <View style={styles.chips}>
              {toolsInCategory(category.id).map((tool) => (
                <Pressable
                  key={tool.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/editor/[toolId]', params: { toolId: tool.id } })
                  }
                  style={styles.chip}>
                  <Text style={styles.chipLabel}>{tool.name}</Text>
                </Pressable>
              ))}
            </View>
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
    gap: space.md,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  placeholder: {
    height: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  placeholderTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  placeholderBody: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  rowItem: {
    flex: 1,
  },
  secondary: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  block: {
    gap: 6,
  },
  category: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  blurb: {
    color: colors.textMuted,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipLabel: {
    fontWeight: '600',
    color: colors.text,
  },
});
