// Google Play Integrity: the app's proof, for sign-in, that it's the genuine
// kotes from Google Play on a real device (the web uses Turnstile instead).
import * as AppIntegrity from '@expo/app-integrity';
import * as Crypto from 'expo-crypto';

import { integrityRequest } from '@shared/integrity';

export type AppCheck = { packageName: string; cloudProjectNumber: string };

let prepared: { project: string; ready: Promise<void> } | null = null;

/** Warms up Google's token provider; Google recommends doing it ahead of time. */
export function prepareAppCheck(check: AppCheck) {
  if (prepared?.project !== check.cloudProjectNumber) {
    const ready = AppIntegrity.prepareIntegrityTokenProviderAsync(check.cloudProjectNumber);
    prepared = { project: check.cloudProjectNumber, ready };
    // A failed warm-up is retried on the next sign-in.
    ready.catch(() => (prepared = null));
  }
  return prepared.ready;
}

/** A token bound to this email; the server recomputes the same hash. */
export async function appCheckToken(check: AppCheck | null, email: string): Promise<string | undefined> {
  if (!check) return undefined;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, integrityRequest(email), {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  try {
    await prepareAppCheck(check);
    return await AppIntegrity.requestIntegrityCheckAsync(hash);
  } catch (e) {
    // Providers expire; make a fresh one and try once more.
    if ((e as { code?: string }).code !== 'ERR_APP_INTEGRITY_PROVIDER_INVALID') throw e;
    prepared = null;
    await prepareAppCheck(check);
    return AppIntegrity.requestIntegrityCheckAsync(hash);
  }
}
