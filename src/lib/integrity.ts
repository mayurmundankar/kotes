// Play Integrity binds each sign-in to the email it's for: the app passes
// SHA-256 (hex) of this string as the integrity request hash, and the server
// recomputes it. A token minted for one email can't be replayed for another.
export const ANDROID_PACKAGE = "com.kotes";
export const integrityRequest = (email: string) => `kotes-signin:${email}`;
