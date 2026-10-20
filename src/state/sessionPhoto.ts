/**
 * A session's photo: from the library or the camera, cropped to 4:3 and shrunk
 * to 1440 px on the long edge, saved as a JPEG on the phone (Arro's photo rules,
 * spec section 3, Log session form). The outbox uploads that file.
 *
 * iOS's picker only crops to a square (Expo SDK 57 image picker docs: `aspect`
 * applies on Android only), so the picker doesn't edit and the 4:3 crop happens
 * here, centered.
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type PhotoSource = 'camera' | 'library';

/** Long edge of a session photo, in pixels. */
export const SESSION_PHOTO_EDGE = 1440;
/** Width over height. Portrait photos are cropped to 3:4. */
export const SESSION_PHOTO_ASPECT = 4 / 3;

/**
 * The centered crop to 4:3 (or 3:4 for a portrait photo), and the size it's
 * shrunk to. Whole pixels, never larger than the photo.
 */
export function sessionCrop(width: number, height: number) {
  const landscape = width >= height;
  const ratio = landscape ? SESSION_PHOTO_ASPECT : 1 / SESSION_PHOTO_ASPECT;
  let cw = width;
  let ch = Math.round(width / ratio);
  if (ch > height) {
    ch = height;
    cw = Math.round(height * ratio);
  }
  const crop = { originX: Math.floor((width - cw) / 2), originY: Math.floor((height - ch) / 2), width: cw, height: ch };
  const long = Math.max(cw, ch);
  const scale = long > SESSION_PHOTO_EDGE ? SESSION_PHOTO_EDGE / long : 1;
  const size = { width: Math.round(cw * scale), height: Math.round(ch * scale) };
  return { crop, size };
}

/** Crop and shrink a picked photo; returns the JPEG's local uri. */
export async function prepareSessionPhoto(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  const { crop, size } = sessionCrop(original.width, original.height);
  context.crop(crop);
  if (size.width !== crop.width) context.resize(size);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

async function allowed(source: PhotoSource): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;
  if (!permission.canAskAgain) {
    Alert.alert(
      source === 'camera' ? 'The camera is off for Saunafam' : 'Photos are off for Saunafam',
      'You can turn them on in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  }
  return false;
}

/**
 * Asks for access the first time, opens the camera or the library, and returns
 * the prepared photo's uri, or null when the person cancels or says no.
 */
export async function pickSessionPhoto(source: PhotoSource): Promise<string | null> {
  if (!(await allowed(source))) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const uri = result.canceled ? null : result.assets[0]?.uri ?? null;
  return uri ? prepareSessionPhoto(uri) : null;
}
