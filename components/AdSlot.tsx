import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';
import { getStandardAd, trackClick, trackImpression, type AdContent } from '@/lib/ads';

const HOUSE_BODY = 'Reserved ad space · never interrupts editing';

export function AdSlot({ label = 'Sponsored' }: { label?: string }) {
  const [ad, setAd] = useState<AdContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStandardAd()
      .then((loaded) => {
        if (cancelled || !loaded) return;
        setAd(loaded);
        if (!loaded.isHouse) {
          void trackImpression(loaded, 'standard');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const shownLabel = ad && !ad.isHouse ? 'Sponsored' : label;
  const shownBody = ad?.body || HOUSE_BODY;

  async function openAd() {
    if (!ad?.clickUrl) return;
    void trackClick(ad, 'standard');
    try {
      await WebBrowser.openBrowserAsync(ad.clickUrl);
    } catch {
      // Browser unavailable: stay put.
    }
  }

  const content = (
    <View style={styles.slot} accessibilityRole="summary" accessibilityLabel="Standard ad slot">
      <Text style={styles.label}>{shownLabel}</Text>
      {ad && !ad.isHouse ? <Text style={styles.title}>{ad.title}</Text> : null}
      <Text style={styles.body}>{shownBody}</Text>
    </View>
  );

  if (ad?.clickUrl) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={ad.title} onPress={openAd}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
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
  title: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
