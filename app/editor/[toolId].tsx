import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, space } from '@/constants/theme';
import { toolById } from '@/constants/tools';
import { useEditor } from '@/context/EditorContext';
import { runEdit } from '@/lib/editPipeline';
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
  const lastRunKey = useRef<string | null>(null);

  async function applyEdit() {
    if (!photoUri || !tool || busy) return;
    lastRunKey.current = `${tool.id}:${photoUri}:${intensity}`;
    setBusy(true);
    setError(null);
    try {
      const output = await runEdit(photoUri, tool.id, intensity);
      setResult(output);
      setShowAfter(true);
    } catch {
      setError('Edit failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const sourceUri = photoUri;
    const activeTool = tool;
    if (!sourceUri || resultUri || !activeTool) return;
    const key = `${activeTool.id}:${sourceUri}:${intensity}`;
    if (lastRunKey.current === key) return;
    lastRunKey.current = key;
    let cancelled = false;

    async function run(uri: string, toolId: string, level: number) {
      setBusy(true);
      setError(null);
      try {
        const output = await runEdit(uri, toolId, level);
        if (cancelled) return;
        setResult(output);
        setShowAfter(true);
      } catch {
        if (!cancelled) setError('Edit failed. Try again.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    run(sourceUri, activeTool.id, intensity);
    return () => {
      cancelled = true;
    };
  }, [photoUri, resultUri, tool, intensity, setResult]);

  async function choosePhoto() {
    const uri = await pickPhotoFromLibrary();
    if (uri) {
      lastRunKey.current = null;
      setPhoto(uri);
    }
  }

  function resetToOriginal() {
    if (!photoUri || !tool || busy) return;
    lastRunKey.current = `${tool.id}:${photoUri}:${intensity}`;
    setResult(null);
    setShowAfter(false);
    setError(null);
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
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={showAfter ? 'Edited photo' : 'Original photo'}
              accessibilityHint="Hold to peek at the original photo"
              delayLongPress={200}
              onLongPress={() => setShowAfter(false)}
              onPressOut={() => setShowAfter(true)}>
              <Image
                source={{ uri: previewUri ?? photoUri }}
                style={styles.photo}
                accessibilityLabel={showAfter ? 'Edited photo' : 'Original photo'}
              />
            </Pressable>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.busyText}>Processing {tool.name}…</Text>
              </View>
            ) : null}
          </View>
        )}

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={applyEdit}
              disabled={busy}
              style={styles.reapply}
              accessibilityRole="button">
              <Text style={styles.reapplyLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {photoUri && resultUri ? (
          <View>
            <View style={styles.toggleRow}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setShowAfter(false)}
                style={[styles.toggle, !showAfter && styles.toggleOn, busy && styles.disabled]}>
                <Text style={[styles.toggleLabel, !showAfter && styles.toggleLabelOn]}>Before</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setShowAfter(true)}
                style={[styles.toggle, showAfter && styles.toggleOn, busy && styles.disabled]}>
                <Text style={[styles.toggleLabel, showAfter && styles.toggleLabelOn]}>After</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Hold the photo to peek at Before. Or reset:</Text>
            <Pressable
              onPress={resetToOriginal}
              disabled={busy}
              style={styles.reapply}
              accessibilityRole="button">
              <Text style={styles.reapplyLabel}>Reset to original</Text>
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
                  disabled={busy}
                  onPress={() => setIntensity(option.value)}
                  style={[
                    styles.toggle,
                    intensity === option.value && styles.toggleOn,
                    busy && styles.disabled,
                  ]}>
                  <Text style={[styles.toggleLabel, intensity === option.value && styles.toggleLabelOn]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={applyEdit}
              disabled={busy}
              style={styles.reapply}
              accessibilityRole="button">
              <Text style={styles.reapplyLabel}>
                {resultUri ? 'Apply intensity' : `Apply ${tool.name}`}
              </Text>
            </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  errorRow: {
    gap: 4,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
