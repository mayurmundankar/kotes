// The share image on the device: kept in the app's cache, handed to Android's
// share sheet (Instagram, WhatsApp, …), or saved to the gallery.
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export class SaveRefused extends Error {}

/** Writes the PNG to the cache and returns a local URI for preview and sharing. */
export async function storeImage(bytes: ArrayBuffer, name: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(new Uint8Array(bytes));
  return file.uri;
}

export function dropImage(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {}
}

export async function shareImage(uri: string) {
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this quote' });
}

/**
 * Saves into the gallery (Pictures). Android 11+ needs no permission for an
 * app's own images; older versions ask for storage once. kotes never asks to
 * read the reader's photos.
 */
export async function saveImage(uri: string) {
  if (Platform.OS === 'android' && Number(Platform.Version) < 30) {
    const { granted } = await requestPermissionsAsync(true, []);
    if (!granted) throw new SaveRefused('kotes needs storage access to save the image.');
  }
  await Asset.create(uri);
}
