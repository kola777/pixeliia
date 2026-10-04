import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Default (web) implementation: view-shot is a native-only module
 * (Android/iOS), so importing it here would break the web bundle at load
 * time. The native variant lives in capturePhoto.native.ts, which Metro
 * picks up automatically on device builds. Callers must catch and fall
 * back to saving the plain file.
 */
export async function captureComposition(
  _viewRef: RefObject<View | null>,
  _options: { quality?: number; width?: number; height?: number }
): Promise<string> {
  throw new Error('Photo capture is only available on Android and iOS.');
}
