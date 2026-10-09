/**
 * Photo picking and shrinking, behind a few functions so screens don't import the
 * picker directly. Photos upload to Supabase Storage (backend.ts), where everyone
 * in the family can see them.
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Turns on the photo buttons on Log today, Edit profile, the workout page, and the photo step in onboarding. */
export const PHOTOS_ON = true;

export type PhotoShape = 'square' | 'landscape';

/**
 * Asks for photo access (only the first time), then opens the library with a crop
 * to the right shape: square for a profile, 4:3 for a workout.
 * Returns a local image uri, or null when the person cancels or says no.
 */
export async function pickPhoto(shape: PhotoShape = 'square'): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) {
      Alert.alert('Photos are off for Arro', 'You can turn them on in Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: shape === 'square' ? [1, 1] : [4, 3],
    quality: 1,
  });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

/** Long edge in pixels: enough for a phone screen, small enough for a slow connection. */
const MAX_EDGE: Record<PhotoShape, number> = { square: 640, landscape: 1440 };

/**
 * Shrinks a picked photo to a JPEG of a few hundred KB and returns its bytes,
 * ready to upload (an ArrayBuffer, the body Supabase's React Native docs use).
 * A picked photo is already cropped, so only the size changes.
 */
export async function photoForUpload(uri: string, shape: PhotoShape): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  const edge = MAX_EDGE[shape];
  const resized =
    Math.max(original.width, original.height) > edge
      ? await context
          .resize(original.width >= original.height ? { width: edge } : { height: edge })
          .renderAsync()
      : original;
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!saved.base64) throw new Error('The photo couldn’t be read');
  return base64ToBytes(saved.base64);
}

function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
