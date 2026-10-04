import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Native implementation: screenshot the watermark composition at layout
 * size (Standard) or at explicit pixel dimensions (HD). Replaces
 * capturePhoto.ts on Android/iOS via Metro's platform extensions.
 */
export async function captureComposition(
  viewRef: RefObject<View | null>,
  options: { quality?: number; width?: number; height?: number }
): Promise<string> {
  return captureRef(viewRef, {
    format: 'jpg',
    quality: options.quality ?? 0.9,
    result: 'tmpfile',
    ...(options.width && options.height
      ? { width: options.width, height: options.height }
      : {}),
  });
}
