import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';
import { getHomeBillboard, trackClick, trackImpression, type AdContent } from '@/lib/ads';

const HOUSE_KICKER = 'Premium billboard · hourly booking';
const HOUSE_TITLE = 'Your brand, this hour';
const HOUSE_BODY = 'Exclusive home placement. No pop-ups, never covers the editor.';

export function Billboard() {
  const [ad, setAd] = useState<AdContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHomeBillboard()
      .then((loaded) => {
        if (cancelled || !loaded) return;
        setAd(loaded);
        if (!loaded.isHouse) {
          void trackImpression(loaded, 'home_billboard');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const kicker = ad ? (ad.isHouse ? HOUSE_KICKER : 'Sponsored') : HOUSE_KICKER;
  const title = ad?.title ?? HOUSE_TITLE;
  const body = ad?.body || HOUSE_BODY;

  async function openAd() {
    if (!ad?.clickUrl) return;
    void trackClick(ad, 'home_billboard');
    try {
      await WebBrowser.openBrowserAsync(ad.clickUrl);
    } catch {
      // Browser unavailable: the impression is already recorded; stay put.
    }
  }

  const content = (
    <View style={styles.slot} accessibilityRole="summary" accessibilityLabel="Premium home billboard">
      {ad?.imageUrl ? (
        <Image source={{ uri: ad.imageUrl }} style={styles.image} accessibilityLabel={title} />
      ) : null}
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );

  if (ad?.clickUrl) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={openAd}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 148,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: space.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD9FF',
  },
  image: {
    width: '100%',
    height: 104,
    borderRadius: radius.md,
    marginBottom: space.sm,
    backgroundColor: colors.border,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
