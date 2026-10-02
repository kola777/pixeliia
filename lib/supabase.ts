import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type RawStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

function deviceStorage(): RawStorage | undefined {
  const candidate = (globalThis as Record<string, unknown>).localStorage as
    | RawStorage
    | undefined;
  if (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  ) {
    return candidate;
  }
  return undefined;
}

let client: SupabaseClient | null = null;
let autoRefreshWired = false;

/** True once EXPO_PUBLIC_SUPABASE_* env vars are present (dev builds, EAS). */
export function isSupabaseConfigured() {
  return !!supabaseUrl && !!supabasePublishableKey;
}

/**
 * Lazily-created Supabase client. Returns null when the backend is not
 * configured so the app keeps working in local preview mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabasePublishableKey) return null;
  if (!client) {
    const store = deviceStorage();
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        ...(store
          ? {
              storage: {
                getItem: (key: string) =>
                  Promise.resolve(store.getItem(key)).then((value) => value ?? null),
                setItem: (key: string, value: string) =>
                  Promise.resolve(store.setItem(key, value)).then(() => undefined),
                removeItem: (key: string) =>
                  Promise.resolve(store.removeItem(key)).then(() => undefined),
              },
            }
          : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    if (!autoRefreshWired) {
      autoRefreshWired = true;
      AppState.addEventListener('change', (state) => {
        if (!client) return;
        if (state === 'active') {
          client.auth.startAutoRefresh();
        } else {
          client.auth.stopAutoRefresh();
        }
      });
    }
  }
  return client;
}
