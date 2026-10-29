# Releasing kotes on Google Play

From this repo to the app on Google Play, in order. Commands run from `mobile/`. What to type into each Play Console form is in [`store/listing.md`](store/listing.md).

Google requires two things of new **personal** developer accounts:

- The first upload is made by hand in Play Console. After that, `eas submit` can upload builds.
- Before going live, the app runs a **closed test with at least 12 testers, opted in for 14 days in a row**. Only then can you apply for production access.

Plan for about three weeks from step 1 to readers.

## 1. One-time setup

1. Install **Node.js 22.13 or newer** (Expo SDK 58 needs it), then run `npm install`.
2. Create an Expo account, then link this project to it:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   `init` adds the project ID to `app.json`. Commit that change.
3. In [Play Console](https://play.google.com/console), choose **Create app**: name `kotes`, English, App, Free. Accept the declarations.

## 2. The first build and upload

1. Build the release bundle:
   ```bash
   npx eas-cli@latest build -p android --profile production
   ```
   On the first run, let EAS **generate a new keystore**. That's the upload key. EAS stores it, and Google holds the real signing key (Play App Signing).
2. Download the `.aab` from the build page. In Play Console go to **Test and release → Testing → Internal testing → Create new release** and upload it. This fixes the package name as `com.kotes` for good.

## 3. Switch on Play Integrity (the app's human check)

Until this is done the app can't sign anyone in, because the server falls back to Turnstile, which the app can't pass.

1. In Play Console, open the app and go to **Protected with Play → Play Integrity API → Get started → Play Integrity API settings → Link Cloud project**. Create a project, or pick one. Linking also switches the API on in that project.
2. In that project in the [Google Cloud console](https://console.cloud.google.com), go to **IAM and admin → Service accounts**, create one (no roles needed), and add a **JSON key**. The account must be in the linked project.
3. On the server, add the following to `.env`, then redeploy with `docker compose up -d --build`:
   ```
   PLAY_INTEGRITY_PROJECT_NUMBER=<the project's number, from its settings page>
   PLAY_INTEGRITY_SERVICE_ACCOUNT=<base64 of the JSON key>
   ```
   To get the base64 of the key:
   ```bash
   node -e "console.log(require('fs').readFileSync('key.json').toString('base64'))"
   ```
4. Check it: `GET https://kotes.mayurmundankar.com/api/auth/config` should now show `"android": {"packageName": "com.kotes", …}`.

## 4. The review account

Google's reviewers can't receive kotes' emails. Choose an address and a code, put both in the server's `.env`, and redeploy:

```
REVIEW_EMAIL=review@kotes.mayurmundankar.com
REVIEW_CODE=<6 random digits>
```

That address signs in with that code, and no email is sent to it. Enter both under **App content → App access** (see `store/listing.md`). Keep the account for as long as the app is listed, because Google reviews every update.

## 5. Internal testing (you)

1. Under **Internal testing → Testers**, add your own Google account and open the opt-in link on your phone. Install kotes from Play.
2. Try everything:
   - sign in (Play Integrity passes only for an install from Play)
   - onboarding
   - the feed: swipe, double-tap, keep
   - share to Instagram or WhatsApp, and Save image
   - Kept, Retune, sign out
   - delete a test account
3. Take the phone screenshots for the listing while you're there.

## 6. Store listing and App content

Fill in every page under **Grow → Main store listing** and **Policy → App content** from `store/listing.md`. Those are the listing, privacy policy, app access, ads, content rating, target audience, data safety and account deletion. The dashboard shows a tick for each one.

## 7. Closed testing (12 testers × 14 days)

1. Go to **Testing → Closed testing → Create track** (or use the default *Alpha*). Add at least 12 testers, as an email list or a Google Group. Send them the opt-in link and ask them to keep the app installed and use it now and then.
2. Ship builds to the track:
   ```bash
   npx eas-cli@latest build -p android --profile production
   npx eas-cli@latest submit -p android --profile closed --latest
   ```
   Before `submit` works, create a service account with **Play Console access**:
   - Play Console → **Users and permissions → Invite user**: invite the service account's email with *Release* permissions.
   - Save its JSON key as `mobile/secrets/play-service-account.json`. The folder is git-ignored.

   Uploads arrive as **drafts**. Press **Review release → Start rollout** in Play Console to release one.
3. After 14 days with 12 or more testers opted in, go to the Dashboard → **Apply for production**, and answer Google's questions about the test.

## 8. Production

Once production access is granted, promote the tested release (or run `submit --profile production`) and start with a **staged rollout**, for example 20%. Then raise it as Android vitals stay clean.

## Updates

- Change `version` in `app.json` for every release readers will notice (`1.0.1`, `1.1.0`). The build number (`versionCode`) goes up by itself (`autoIncrement`, stored by EAS).
- Server changes deploy as before. The app follows `https://kotes.mayurmundankar.com/api`, so keep the API backwards compatible: older app versions stay installed for months.
- Crashes in Android's own code and app freezes show up in Play Console under **Android vitals**. JavaScript errors reach the server's log as `"sec":"client_error"`.

## Optional: App Links

To make `kotes.mayurmundankar.com` links open the app, copy the **SHA-256 certificate fingerprint** from App integrity → App signing. Put it in `public/.well-known/assetlinks.json` on the website and add an `intentFilters` entry to `app.json`. kotes shares images, not links, so this can wait.
