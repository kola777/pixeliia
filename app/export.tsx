import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { WatermarkedPhoto } from '@/components/WatermarkedPhoto';
import { EXPORT_OPTIONS } from '@/constants/exportOptions';
import { colors, radius, space } from '@/constants/theme';
import { toolById } from '@/constants/tools';
import { useEditor } from '@/context/EditorContext';
import { track } from '@/lib/analytics';
import { captureComposition } from '@/lib/capturePhoto';
import { requestGalleryAccess, saveToGallery } from '@/lib/gallery';

const PREVIEW_HEIGHT = 360;
const HD_MAX_EDGE = 2048;

function getPhotoSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Could not read the photo dimensions.'))
    );
  });
}

function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export default function ExportScreen() {
  const router = useRouter();
  const { toolId } = useLocalSearchParams<{ toolId?: string }>();
  const tool = toolById(toolId ?? '');
  const { photoUri, resultUri, balance, spend, refund, grantTestEspee, saveProject } = useEditor();
  const { width: windowWidth } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const compositionRef = useRef<View>(null);

  const sourceUri = resultUri ?? photoUri;
  const previewWidth = Math.round(windowWidth - space.md * 2);

  async function ensureGalleryPermission() {
    const granted = await requestGalleryAccess();
    if (!granted) {
      Alert.alert('Gallery access needed', 'Allow gallery access to save your exported photo.');
      return false;
    }
    return true;
  }

  async function saveFile(uri: string) {
    await saveToGallery(uri);
  }

  function finishExport(label: string) {
    if (tool) {
      saveProject(tool.id, tool.name);
    }
    Alert.alert('Saved', `${label} Saved to your gallery and My Photos.`);
    router.push('/(tabs)/photos');
  }

  function offerTestTopUp() {
    Alert.alert('Not enough ESPEE', `Balance: ${balance} ESPEE. Real billing is not connected yet.`, [
      { text: 'Add 10 test ESPEE', onPress: grantTestEspee },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function exportStandard() {
    if (!sourceUri) {
      Alert.alert('No photo', 'Select a photo before exporting.');
      return;
    }
    setBusy(true);
    setStatus('Capturing watermarked photo…');
    try {
      if (!(await ensureGalleryPermission())) return;
      let fileUri: string;
      let watermarked = true;
      try {
        fileUri = await captureComposition(compositionRef, { quality: 0.9 });
      } catch {
        // view-shot is native-only; on web fall back to the plain file.
        fileUri = sourceUri;
        watermarked = false;
      }
      await saveFile(fileUri);
      track('export_completed', { option: 'standard', paid: false, watermarked });
      finishExport(
        watermarked
          ? 'Standard download is free and includes the Pixeliia watermark.'
          : 'Standard download saved without watermark (preview capture is unavailable on web).'
      );
    } catch {
      Alert.alert('Save failed', 'Could not save to the gallery. Try again.');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  async function exportHd() {
    if (!sourceUri) {
      Alert.alert('No photo', 'Select a photo before exporting.');
      return;
    }
    if (!(await ensureGalleryPermission())) return;
    if (!spend(2, 'HD Download')) {
      offerTestTopUp();
      return;
    }
    setBusy(true);
    setStatus('Preparing HD export…');
    try {
      const native = await getPhotoSize(sourceUri);
      const target = fitWithin(native.width, native.height, HD_MAX_EDGE);
      const fileUri = await captureComposition(compositionRef, {
        quality: 1,
        width: target.width,
        height: target.height,
      });
      await saveFile(fileUri);
      track('export_completed', { option: 'hd', paid: true, cost: 2 });
      finishExport(`HD download (${target.width}×${target.height}) with Pixeliia watermark. 2 ESPEE charged.`);
    } catch (err) {
      refund(2, 'HD Download');
      Alert.alert(
        'Save failed',
        `${err instanceof Error ? err.message : 'Could not save to the gallery.'} Your 2 ESPEE were refunded.`
      );
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  async function exportClean() {
    if (!sourceUri) {
      Alert.alert('No photo', 'Select a photo before exporting.');
      return;
    }
    if (!(await ensureGalleryPermission())) return;
    if (!spend(1, 'Remove Pixeliia Watermark')) {
      offerTestTopUp();
      return;
    }
    setBusy(true);
    setStatus('Saving clean export…');
    try {
      await saveFile(sourceUri);
      track('export_completed', { option: 'remove-watermark', paid: true, cost: 1 });
      finishExport('Clean export without the Pixeliia mark. 1 ESPEE charged.');
    } catch {
      refund(1, 'Remove Pixeliia Watermark');
      Alert.alert('Save failed', 'Could not save to the gallery. Your 1 ESPEE was refunded.');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  function choose(optionId: string, enabled: boolean) {
    if (busy) return;
    if (!enabled) {
      Alert.alert('Coming later', 'This export option is planned for a later release.');
      return;
    }
    if (optionId === 'standard') void exportStandard();
    else if (optionId === 'hd') void exportHd();
    else if (optionId === 'remove-pixeliia-watermark') void exportClean();
    else Alert.alert('Coming later', 'This export option is planned for a later release.');
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Export</Text>
        <Text style={styles.lede}>
          Ads never gate this step. Prices can change later without redesigning the editor.
        </Text>
        <Text style={styles.balance}>Balance: {balance} ESPEE</Text>

        {!sourceUri ? (
          <View style={styles.card}>
            <Text style={styles.name}>No photo yet</Text>
            <Text style={styles.hint}>Choose a photo first, then come back to export it.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/edit')}
              style={styles.link}>
              <Text style={styles.linkLabel}>Choose a photo</Text>
            </Pressable>
          </View>
        ) : null}

        {sourceUri ? (
          <WatermarkedPhoto
            uri={sourceUri}
            width={previewWidth}
            height={PREVIEW_HEIGHT}
            viewRef={compositionRef}
          />
        ) : null}
        {status ? <Text style={styles.status}>{status}</Text> : null}

        {EXPORT_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !option.mvp || busy }}
            disabled={busy}
            onPress={() => choose(option.id, option.mvp)}
            style={[styles.card, (!option.mvp || busy) && styles.disabled]}>
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
  balance: {
    fontWeight: '700',
    color: colors.accent,
    marginBottom: space.sm,
  },
  status: {
    color: colors.accent,
    fontWeight: '700',
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
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
});
