// Play Integrity exists only on Android (integrity.android.ts). Elsewhere (the
// web preview) there's no token, so the server applies its Turnstile check.
export type AppCheck = { packageName: string; cloudProjectNumber: string };

export function prepareAppCheck(_check: AppCheck) {
  return Promise.resolve();
}

export async function appCheckToken(_check: AppCheck | null, _email: string): Promise<string | undefined> {
  return undefined;
}
