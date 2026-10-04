/**
 * Native gallery: real saves into the OS photo library.
 * Replaces gallery.ts on Android/iOS via Metro's platform extensions.
 */
import { Asset, requestPermissionsAsync } from 'expo-media-library';

export async function requestGalleryAccess(): Promise<boolean> {
  const permission = await requestPermissionsAsync();
  return permission.granted;
}

export async function saveToGallery(uri: string): Promise<void> {
  await Asset.create(uri);
}
