import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUserId, getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Minimal success-metrics tracking (PRD section 15).
 * - Events queue in AsyncStorage and flush in batches when the backend is
 *   configured; fully offline-safe, never throws, never blocks UI.
 * - Event names are a fixed vocabulary so dashboards stay consistent.
 */

export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'photo_selected'
  | 'edit_succeeded'
  | 'edit_failed'
  | 'export_completed'
  | 'account_upgraded';

type QueuedEvent = {
  name: AnalyticsEvent;
  props: Record<string, string | number | boolean>;
  at: number;
};

const QUEUE_KEY = 'pixeliia:analytics:v1';
const FLUSH_MIN_EVENTS = 5;
const FLUSH_MIN_INTERVAL_MS = 30_000;

const sessionId = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
let flushing = false;
let lastFlush = 0;

async function readQueue(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function flush() {
  if (flushing || !isSupabaseConfigured()) return;
  const queue = await readQueue();
  if (queue.length === 0) return;
  if (queue.length < FLUSH_MIN_EVENTS && Date.now() - lastFlush < FLUSH_MIN_INTERVAL_MS) return;
  flushing = true;
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    if (!supabase || !userId) return;
    const batch = queue.slice(0, 100);
    const { error } = await supabase.from('app_events').insert(
      batch.map((event) => ({
        user_id: userId,
        session_id: sessionId,
        name: event.name,
        props: event.props,
      }))
    );
    if (!error) {
      lastFlush = Date.now();
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(batch.length)));
    }
  } catch {
    // Offline or backend down: keep the queue for next time.
  } finally {
    flushing = false;
  }
}

/** Fire-and-forget funnel event. Safe to call from anywhere, including render paths. */
export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  readQueue()
    .then((queue) =>
      AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, { name, props, at: Date.now() }].slice(-500)))
    )
    .then(() => flush())
    .catch(() => {});
}
