import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, space } from '@/constants/theme';
import { toolById } from '@/constants/tools';
import { useEditor } from '@/context/EditorContext';
import { pickPhotoFromLibrary } from '@/lib/pickPhoto';

const INTENSITY = [
  { value: 25, label: 'Subtle' },
  { value: 50, label: 'Natural' },
  { value: 75, label: 'Strong' },
];

export default function EditorScreen() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>();
  const tool = toolById(toolId ?? '');
  const router = useRouter();
  const { photoUri, resultUri, intensity, setPhoto, setResult, setIntensity } = useEditor();
  const [busy, setBusy] = useState(false);
  const [showAfter, setShowAfter] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUri || resultUri || !tool) return;
    let cancelled = false;

    async function run() {
      setBusy(true);
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 1100));
      if (cancelled) return;
      setResult(photoUri);
      setShowAfter(true);
      setBusy(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [photoUri, resultUri, tool, setResult]);

  async function choosePhoto() {
    const uri = await pickPhotoFromLibrary();
    if (uri) setPhoto(uri);
  }

  async function applyAgain() {
    if (!photoUri) return;
    setBusy(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setResult(photoUri);
      setShowAfter(true);
    } catch {
      setError('Edit failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!tool) {
    return (
      <AppScreen>
        <View style={styles.missing}>
          <Text style={styles.headline}>Tool not found</Text>
          <PrimaryButton label="Back home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </AppScreen>
    );
  }

  const previewUri = showAfter ? resultUri ?? photoUri : photoUri;

  return (
    <AppScreen>
      <Stack.Screen options={{ title: tool.name }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lede}>{tool.description}</Text>

        {!photoUri ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Choose a photo first</Text>
            <Text style={styles.placeholderBody}>Then Pixeliia runs this tool in one tap.</Text>
            <PrimaryButton label="Choose photo" onPress={choosePhoto} />
          </View>
        ) : (
          <View>
            <Image
              source={{ uri: previewUri ?? photoUri }}
              style={styles.photo}
              accessibilityLabel={showAfter ? 'Edited photo' : 'Original photo'}
            />
            {busy ? (
              <View style={styles.busy}>
                <Text style={styles.busyText}>Processing {tool.name}…</Text>
              </View>
            ) : null}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {photoUri && resultUri && !busy ? (
          <View style={styles.toggleRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAfter(false)}
              style={[styles.toggle, !showAfter && styles.toggleOn]}>
              <Text style={[styles.toggleLabel, !showAfter && styles.toggleLabelOn]}>Before</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAfter(true)}
              style={[styles.toggle, showAfter && styles.toggleOn]}>
              <Text style={[styles.toggleLabel, showAfter && styles.toggleLabelOn]}>After</Text>
            </Pressable>
          </View>
        ) : null}

        {tool.intensity && photoUri ? (
          <View>
            <Text style={styles.section}>Intensity</Text>
            <View style={styles.toggleRow}>
              {INTENSITY.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => setIntensity(option.value)}
                  style={[styles.toggle, intensity === option.value && styles.toggleOn]}>
                  <Text style={[styles.toggleLabel, intensity === option.value && styles.toggleLabelOn]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {resultUri ? (
              <Pressable onPress={applyAgain} style={styles.reapply} accessibilityRole="button">
                <Text style={styles.reapplyLabel}>Apply intensity</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.note}>
          AI backend is not connected yet. This preview keeps your original photo so the flow can be
          tested.
        </Text>

        <PrimaryButton
          label="Export"
          disabled={!photoUri || busy}
          onPress={() => router.push({ pathname: '/export', params: { toolId: tool.id } })}
        />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.sm,
    paddingBottom: space.xl,
    gap: space.md,
  },
  missing: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  photo: {
    width: '100%',
    height: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  busy: {
    marginTop: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  busyText: {
    color: colors.accent,
    fontWeight: '700',
  },
  placeholder: {
    minHeight: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    justifyContent: 'center',
    gap: space.md,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  placeholderBody: {
    color: colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  toggleLabel: {
    fontWeight: '700',
    color: colors.textMuted,
  },
  toggleLabelOn: {
    color: colors.accent,
  },
  section: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  reapply: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  reapplyLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
});
