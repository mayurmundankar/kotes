// The session token lives in the Android Keystore (expo-secure-store). The web
// preview has no keystore, so it falls back to localStorage there.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

export const storage = {
  async get(key: string) {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (web) return globalThis.localStorage?.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (web) return globalThis.localStorage?.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
