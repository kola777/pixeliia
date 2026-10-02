import { getCurrentUserId, getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Ads serving + measurement, PRD section 8.
 * - Fixed slots: the client always reserves layout space; these helpers only
 *   decide what fills it (paid creative or house fallback).
 * - Never count an edit as an impression: events are written only by the
 *   explicit track* calls below, once per creative per session for
 *   impressions. Server-side aggregation and fraud controls come later.
 * - Everything no-ops to null when the backend is not configured.
 */

export type AdContent = {
  campaignId: string | null;
  creativeId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  clickUrl: string | null;
  isHouse: boolean;
};

type CreativeRow = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  click_url: string | null;
  is_house: boolean;
  campaign_id: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; ad: AdContent | null }>();
const seenImpressions = new Set<string>();

function toAd(
  row: CreativeRow,
  campaignId: string | null
): AdContent {
  return {
    campaignId: campaignId ?? row.campaign_id,
    creativeId: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    clickUrl: row.click_url,
    isHouse: row.is_house,
  };
}

const CREATIVE_FIELDS = 'id,title,body,image_url,click_url,is_house,campaign_id';

export async function getHomeBillboard(): Promise<AdContent | null> {
  if (!isSupabaseConfigured()) return null;
  const cached = cache.get('home_billboard');
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.ad;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const now = new Date().toISOString();
    const { data: booking } = await supabase
      .from('billboard_bookings')
      .select(`campaign_id, ad_campaigns!inner(status), ad_creatives!inner(${CREATIVE_FIELDS})`)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .eq('ad_campaigns.status', 'active')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const booked = booking as {
      campaign_id: string;
      ad_creatives: CreativeRow;
    } | null;
    if (booked?.ad_creatives) {
      const ad = toAd(booked.ad_creatives, booked.campaign_id);
      cache.set('home_billboard', { at: Date.now(), ad });
      return ad;
    }
    const { data: house } = await supabase
      .from('ad_creatives')
      .select(CREATIVE_FIELDS)
      .eq('placement_id', 'home_billboard')
      .eq('is_house', true)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    const ad = house ? toAd(house as CreativeRow, null) : null;
    cache.set('home_billboard', { at: Date.now(), ad });
    return ad;
  } catch {
    return cache.get('home_billboard')?.ad ?? null;
  }
}

export async function getStandardAd(): Promise<AdContent | null> {
  if (!isSupabaseConfigured()) return null;
  const cached = cache.get('standard');
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.ad;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase
      .from('ad_creatives')
      .select(CREATIVE_FIELDS)
      .eq('placement_id', 'standard')
      .eq('is_active', true)
      .order('is_house', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const ad = data ? toAd(data as CreativeRow, null) : null;
    cache.set('standard', { at: Date.now(), ad });
    return ad;
  } catch {
    return cache.get('standard')?.ad ?? null;
  }
}

async function writeEvent(
  ad: AdContent,
  placement: string,
  kind: 'impression' | 'click'
) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('ad_events').insert({
      campaign_id: ad.campaignId,
      creative_id: ad.creativeId,
      placement_id: placement,
      kind,
      user_id: userId,
    });
  } catch {
    // Measurement must never break the app.
  }
}

/** Records a display once per creative per session. Never throws. */
export async function trackImpression(ad: AdContent, placement: string) {
  if (ad.isHouse) return;
  const key = `${placement}:${ad.creativeId}`;
  if (seenImpressions.has(key)) return;
  seenImpressions.add(key);
  await writeEvent(ad, placement, 'impression');
}

/** Records a tap. Never throws. */
export async function trackClick(ad: AdContent, placement: string) {
  if (ad.isHouse) return;
  await writeEvent(ad, placement, 'click');
}
