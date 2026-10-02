import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

/**
 * Re-encode the picked photo as compressed JPEG so uploads stay lightweight
 * (PRD performance requirement). Falls back to the original URI on failure.
 */
async function compressPickedPhoto(uri: string) {
  try {
    const context = ImageManipulator.manipulate(uri);
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: 0.8,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export async function pickPhotoFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access needed', 'Allow photo access to start editing.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return compressPickedPhoto(result.assets[0].uri);
}

export async function takePhotoWithCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access needed', 'Allow camera access to take a photo.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return compressPickedPhoto(result.assets[0].uri);
}
