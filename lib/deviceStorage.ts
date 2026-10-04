/**
 * Default (web) storage: the browser already provides localStorage, so the
 * native sqlite-backed store must never be bundled here. Importing
 * expo-sqlite on web breaks the static export (missing worker chunk), so
 * the native variant lives in deviceStorage.native.ts, which Metro picks up
 * automatically on Android/iOS.
 */
export type DeviceStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

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
