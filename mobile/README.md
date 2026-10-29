# kotes for Android

The kotes app for Android (package `com.kotes`), built with Expo SDK 58 and Expo Router. It talks to the same API as the website, `https://kotes.mayurmundankar.com/api`. How the app signs in (Play Integrity, bearer tokens) is in the main README under *How sign-in works*.

## Needs

- **Node.js 22.13 or newer.** SDK 58 doesn't support Node 20.
- An [Expo account](https://expo.dev/signup) for cloud builds (`npx eas-cli@latest login`).
- To run it: an Android phone with USB debugging, or Android Studio's emulator. Builds run on Expo's servers (EAS), so no Android SDK or JDK is needed on this machine.

## Run it

```bash
npm install
npx eas-cli@latest build --profile development --platform android   # once, or after adding a native module
npx expo start                                                        # then open the dev build on the phone
```

The app uses native modules (Play Integrity, the keystore, haptics), so **Expo Go can't run it**. Use the development build.

`npm run web` opens a browser preview for checking layouts. It forwards `/api` to the local Next server on port 3001, which `KOTES_DEV_API` can change. Entrance animations are skipped there.

## Builds

| Profile | What | Command |
| --- | --- | --- |
| `development` | APK with the dev client, for running from `expo start` | `npx eas-cli@latest build -p android --profile development` |
| `preview` | Installable APK, for trying a release build | `npx eas-cli@latest build -p android --profile preview` |
| `production` | Signed `.aab` for Google Play, version code bumped automatically | `npx eas-cli@latest build -p android --profile production` |

Getting it onto Google Play, from the first upload to production, is in [`RELEASE.md`](RELEASE.md). The store listing and Play Console answers are in [`store/listing.md`](store/listing.md).

To point a build at another server, set `EXPO_PUBLIC_API_URL` in [`eas.json`](eas.json), or in `.env.local` for `expo start`.

## Layout

```
src/app/            screens (Expo Router): welcome, login, onboarding, (tabs)/feed, library, you
src/components/     icons, nav, toast, shared UI
src/lib/            API client (backend.ts), session store, keystore, Play Integrity
src/theme.ts        colours, fonts and type, mirroring the web's globals.css
assets/fonts/       TTF copies of the web fonts (built by ../scripts/build-fonts.py)
```

`@shared/*` imports come straight from the website's `../src/lib` (themes, share tones, API types, the integrity request string), so both apps share one source of truth.
