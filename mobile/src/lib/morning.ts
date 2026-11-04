// The morning quote: one quiet notification a day, for readers who asked for it.
//
// Scheduled on the phone, so no server learns who gets one or when, and no
// notification token exists. Each app visit schedules the next two weeks, so
// someone who stops opening kotes stops hearing from it. Off until the reader
// says yes, asked once at most, and forgotten on sign-out.
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { backend, type Quote } from './backend';
import { storage } from './storage';

const KEY = 'kotes.morning';
const CHANNEL = 'morning-quote';
const DAYS = 14;
const SHORT = 120; // reads best in the notification shade, so these go first
const MAX_LENGTH = 220; // the longest that still reads well once expanded
const REFRESH_MS = 20 * 60 * 60 * 1000;
// A real quote even when the app couldn't reach kotes while scheduling.
const OFFLINE_LINES = [
  { text: 'I dwell in Possibility.', author: 'Emily Dickinson' },
  { text: 'Forever is composed of nows.', author: 'Emily Dickinson' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', author: 'Oscar Wilde' },
  { text: 'The best way out is always through.', author: 'Robert Frost' },
  { text: 'I contain multitudes.', author: 'Walt Whitman' },
];

export const HOURS = [7, 8, 9, 10];
export const DEFAULT_HOUR = 8;
export const hourLabel = (hour: number) => `${hour}:00`;

type Prefs = { enabled: boolean; hour: number; offered: boolean; refreshedAt: number };
const NONE: Prefs = { enabled: false, hour: DEFAULT_HOUR, offered: false, refreshedAt: 0 };

export type MorningState = { available: boolean; enabled: boolean; hour: number; blocked: boolean };

const android = Platform.OS === 'android';

async function read(): Promise<Prefs> {
  try {
    const raw = await storage.get(KEY);
    return raw ? { ...NONE, ...JSON.parse(raw) } : NONE;
  } catch {
    return NONE;
  }
}
const write = (prefs: Prefs) => storage.set(KEY, JSON.stringify(prefs));

// Reaches the shade without sound, vibration or a heads-up banner. People can
// raise it in Android's own settings if they want more.
async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Morning quote',
    description: 'One quote each morning, if you turned it on.',
    // eslint-disable-next-line import/namespace -- re-exported through a wildcard the rule can't follow
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
    showBadge: false,
    // eslint-disable-next-line import/namespace -- as above
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/** Nothing interrupts someone already reading; only their own preview shows. */
export function installMorningHandler() {
  if (!android) return;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const preview = n.request.content.data?.preview === true;
      return { shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: preview, shouldShowList: preview };
    },
  });
}

/** The quote itself is the notification: who said it, then the words. Tapping opens it. */
const contentFor = (q: Pick<Quote, 'text' | 'author'> & Partial<Quote>): Notifications.NotificationContentInput => ({
  title: q.author,
  body: `“${q.text}”`,
  data: q.id === undefined ? {} : { quote: q },
});

/** Quotes from the reader's own taste, shortest-reading first. Fetching doesn't count as reading. */
async function fetchQuotes(limit: number) {
  const quotes = (await backend.getFeed(limit, [])).filter((q) => q.text.length <= MAX_LENGTH);
  return [...quotes.filter((q) => q.text.length <= SHORT), ...quotes.filter((q) => q.text.length > SHORT)];
}

// Scheduling takes a moment, so nobody waits on it. One job at a time, in order,
// so turning it off straight after turning it on can't leave anything scheduled.
let jobs: Promise<unknown> = Promise.resolve();
const enqueue = <T>(job: () => Promise<T>) => {
  const run = jobs.then(job, job);
  jobs = run.catch(() => {});
  return run;
};

async function schedule(hour: number) {
  await ensureChannel();
  let quotes: Pick<Quote, 'text' | 'author'>[] = [];
  try {
    quotes = await fetchQuotes(30);
  } catch {
    // Offline: what's already scheduled is better than the built-in lines.
    if ((await Notifications.getAllScheduledNotificationsAsync()).length) return;
  }
  if (!quotes.length) quotes = OFFLINE_LINES;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const mornings: Date[] = [];
  for (let day = 0; day <= DAYS && mornings.length < DAYS; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    date.setHours(hour, 0, 0, 0);
    if (date.getTime() > now + 60_000) mornings.push(date);
  }
  await Promise.all(
    mornings.map((date, i) =>
      Notifications.scheduleNotificationAsync({
        content: contentFor(quotes[i % quotes.length]),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
      }),
    ),
  );
}

export async function getMorning(): Promise<MorningState> {
  const prefs = await read();
  if (!android) return { available: false, enabled: false, hour: prefs.hour, blocked: false };
  const { granted } = await Notifications.getPermissionsAsync();
  // Blocked once they said yes here but Android's settings say no.
  return { available: true, enabled: prefs.enabled && granted, hour: prefs.hour, blocked: prefs.enabled && !granted };
}

/** Called only after the reader has said yes in kotes. Android then asks too. */
export async function enableMorning(hour: number): Promise<MorningState> {
  const prefs = await read();
  if (!android) return getMorning();
  await ensureChannel(); // Android 13+ needs a channel before it will ask.
  const { granted } = await Notifications.requestPermissionsAsync();
  // A refresh of 0 means the next app visit tries again if this scheduling fails.
  await write({ ...prefs, enabled: true, hour, offered: true, refreshedAt: 0 });
  if (granted) scheduleInBackground(hour);
  // Android's answer itself: the state it reports can lag just after the prompt.
  return { available: true, enabled: granted, hour, blocked: !granted };
}

function scheduleInBackground(hour: number) {
  enqueue(() => schedule(hour))
    .then(async () => write({ ...(await read()), refreshedAt: Date.now() }))
    .catch(() => {});
}

export async function disableMorning(): Promise<MorningState> {
  const prefs = await read();
  await write({ ...prefs, enabled: false, offered: true });
  if (android) enqueue(() => Notifications.cancelAllScheduledNotificationsAsync()).catch(() => {});
  return getMorning();
}

export async function setMorningHour(hour: number): Promise<MorningState> {
  const prefs = await read();
  await write({ ...prefs, hour, refreshedAt: 0 });
  const state = await getMorning();
  if (state.enabled) scheduleInBackground(hour);
  return state;
}

/** Lets a reader see exactly what they'll get, right away. */
export async function previewMorning() {
  if (!android) return;
  await ensureChannel();
  const [q] = await fetchQuotes(8).catch(() => [] as Quote[]);
  const content = contentFor(q ?? OFFLINE_LINES[0]);
  await Notifications.scheduleNotificationAsync({
    content: { ...content, data: { ...content.data, preview: true } },
    trigger: { channelId: CHANNEL },
  });
}

/** Tops up the next two weeks. Run on app visits, at most about daily. */
export async function refreshMorning() {
  if (!android) return;
  const prefs = await read();
  if (!prefs.enabled || Date.now() - prefs.refreshedAt < REFRESH_MS) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await enqueue(() => schedule(prefs.hour));
  await write({ ...(await read()), refreshedAt: Date.now() });
}

/** At most once, and never after they've touched the setting themselves. */
export async function shouldOfferMorning() {
  if (!android) return false;
  const prefs = await read();
  if (prefs.offered || prefs.enabled) return false;
  await write({ ...prefs, offered: true });
  return true;
}

/** Signing out or deleting the account: stop, and forget the choice. */
export async function forgetMorning() {
  if (!android) return;
  await enqueue(() => Notifications.cancelAllScheduledNotificationsAsync());
  await storage.remove(KEY);
}

export const openAndroidSettings = () => Linking.openSettings();

/** Runs `open` with the quote from a tapped notification, including the tap that launched the app. */
export function onMorningTap(open: (quote: Quote) => void) {
  if (!android) return () => {};
  const handle = (response: Notifications.NotificationResponse | null) => {
    const quote = response?.notification.request.content.data?.quote as Quote | undefined;
    if (quote) open(quote);
    if (response) Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
