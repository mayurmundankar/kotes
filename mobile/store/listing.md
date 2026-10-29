# kotes on Google Play: listing and App content answers

Copy these into Play Console. Each section names the page it belongs to.

## Main store listing (Grow → Store presence → Main store listing)

**App name** (30 max)

> kotes

**Short description** (80 max)

> Endless quotes from the minds worth keeping, tuned to what moves you.

**Full description** (4000 max)

> The feed that reads you back.
>
> kotes is an endless river of lines from poets, stoics, wits and the quietly heartbroken. One quote at a time, full screen, nothing else on the page.
>
> Read. Swipe through quotes on love, melancholy, stoicism, wit, solitude, courage, wisdom, ambition, nature, time, art and hope.
>
> Linger. What you like, keep and linger on teaches kotes your taste. Nothing else does. Pick a few themes to start, and the feed quietly tunes itself, line by line.
>
> Keep. Save the ones that stay with you. A private shelf of words, always within reach.
>
> Share. Turn any quote into a story-sized image in one of four colours, for Instagram, WhatsApp or anywhere else.
>
> For readers only. No posts, no followers, no noise. No ads, no trackers, no passwords: you sign in with a one-time code sent to your email. Delete your account any time, and everything goes with it.

**Graphics**

| Asset | File |
| --- | --- |
| App icon (512×512) | [`icon-512.png`](icon-512.png) |
| Feature graphic (1024×500) | [`feature-graphic.png`](feature-graphic.png) |
| Phone screenshots (2–8, 9:16) | Take them on a phone from the preview build (see RELEASE.md): the feed on a wine card, the feed on a rose card, the share sheet, Kept, and onboarding. |

**Category:** Books & Reference. **Tags:** Quotes, Reading, Books.

**Contact details:** email `privacy.kotes@mayurmundankar.com`, website `https://kotes.mayurmundankar.com`.

## App content (Policy → App content)

**Privacy policy:** `https://kotes.mayurmundankar.com/privacy`

**App access:** *All or some functionality is restricted.* Add one set of instructions:

> Name: Review account
> Username: the server's `REVIEW_EMAIL`
> Password: the server's `REVIEW_CODE`
> Instructions: On the welcome screen tap "Begin reading", enter the email above and tap "Continue with email". No email is sent to this account: enter the 6-digit code above on the next screen. Pick any three themes and tap "Start reading".

**Ads:** No, the app doesn't contain ads.

**Content rating:** fill in the questionnaire with category *Reference, News, or Educational*. Answer **No** to everything: violence, sexuality, language, controlled substances, gambling, user-generated content, user interaction, sharing location, and digital purchases. Quotes are classic literature and may touch on love, sorrow and death, but nothing graphic.

**Target audience:** 13–15, 16–17 and 18 and over (not under 13, which matches the privacy policy). Not designed for children; no appeal to children.

**News app:** No. **Government app:** No. **Financial features:** None. **Health:** None.

**Data safety:**

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | Yes, it collects. |
| Is all data encrypted in transit? | Yes (HTTPS only). |
| Can users request deletion? | Yes. In the app (You → Delete my account) and at `https://kotes.mayurmundankar.com/privacy#delete`. |
| Is data shared with third parties? | No. Supabase, Resend, Cloudflare and Google process it only on kotes' behalf, which Play doesn't count as sharing. |

Data types to tick (all *Collected*, not *Shared*, not *Processed ephemerally*):

| Type | Required? | Purposes |
| --- | --- | --- |
| Personal info → Email address | Required | Account management |
| App activity → App interactions (likes, kept quotes, which quotes were viewed and for how long, chosen themes) | Required | App functionality, Personalization |
| App info and performance → Crash logs | Required | App functionality |
| App info and performance → Diagnostics (error messages, app version) | Required | App functionality |

Leave everything else unticked. kotes doesn't collect location, contacts, photos, files, device IDs or advertising IDs. The IP address is used only in memory, against abuse, which Play's form doesn't ask about. The Play Integrity check is done by Google; kotes only receives a pass or fail.

**Account deletion URL:** `https://kotes.mayurmundankar.com/privacy#delete`

## Release notes for 1.0.0

> The kotes feed, now as an app: endless quotes tuned to you, a shelf for the ones you keep, and story images to share.
