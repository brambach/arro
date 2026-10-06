/**
 * Photo picking, behind one function so screens don't import the picker directly.
 * Returns a local image uri, or null when the person cancels or says no.
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Off for v1: photos never leave the phone that took them until Storage is set up,
 * so the family would never see them. Turning this on brings back the photo
 * buttons on Log today and Edit profile and the photo step in onboarding.
 */
export const PHOTOS_ON = false;

export async function pickPhoto(): Promise<string | null> {
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
    aspect: [1, 1],
    quality: 0.7,
  });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}
