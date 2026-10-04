/**
 * Native storage: sqlite-backed localStorage for Supabase sessions.
 * This file replaces deviceStorage.ts on Android/iOS via Metro's
 * platform extensions, keeping expo-sqlite out of the web bundle.
 */
import 'expo-sqlite/localStorage/install';

import type { DeviceStorage } from './deviceStorage';

export function getDeviceStorage(): DeviceStorage | undefined {
  const candidate = (globalThis as Record<string, unknown>).localStorage as
    | DeviceStorage
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
