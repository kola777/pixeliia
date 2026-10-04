import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { getDeviceStorage } from './deviceStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
    const store = getDeviceStorage();
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

/**
 * Returns the current user id, signing in anonymously on first launch so
 * every device owns its jobs without any sign-up friction. Returns null when
 * the backend is not configured or sign-in fails — callers must stay in
 * local mode in that case.
 */
export async function ensureSignedIn(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData.session?.user) return sessionData.session.user.id;
    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** Current user id without triggering a sign-in (for display only). */
export async function getCurrentUserId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export type AccountInfo = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  emailConfirmed: boolean;
};

/** Full account snapshot for the Profile screen. Null in local mode. */
export async function getAccountInfo(): Promise<AccountInfo | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    const user = data.user;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
      isAnonymous: (user.is_anonymous as boolean | undefined) ?? !user.email,
      emailConfirmed: !!user.email_confirmed_at,
    };
  } catch {
    return null;
  }
}

/**
 * Converts the anonymous guest into a permanent email account (same uid, so
 * jobs and storage stay owned). Falls back to plain sign-up/sign-in when
 * there is no anonymous session to upgrade.
 */
export async function upgradeWithEmail(
  email: string,
  password: string,
  mode: 'signup' | 'signin'
): Promise<{ needsConfirmation: boolean }> {
  const client = getSupabase();
  if (!client) throw new Error('Backend is not connected yet.');
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password needs at least 6 characters.');
  }

  const { data: sessionData } = await client.auth.getSession();
  const current = sessionData.session?.user;
  const isGuest = current && ((current.is_anonymous as boolean | undefined) ?? !current.email);

  if (isGuest && mode === 'signup') {
    const { error } = await client.auth.updateUser({
      email: cleanEmail,
      password,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    const { data: refreshed } = await client.auth.getSession();
    return { needsConfirmation: !refreshed.session };
  }
  if (mode === 'signup') {
    const { data, error } = await client.auth.signUp({ email: cleanEmail, password });
    if (error) throw new Error(friendlyAuthError(error.message));
    return { needsConfirmation: !data.session };
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.session) throw new Error('Sign-in did not return a session. Try again.');
  return { needsConfirmation: false };
}

/** Signs out locally. Guest identities cannot be recovered afterwards. */
export async function signOutAccount() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return 'Email or password is wrong. Try again or create an account.';
  }
  if (/user already registered|already exists/i.test(message)) {
    return 'This email already has an account. Sign in instead.';
  }
  if (/email.*confirm/i.test(message)) {
    return 'Check your inbox to confirm your email, then sign in.';
  }
  return message;
}
