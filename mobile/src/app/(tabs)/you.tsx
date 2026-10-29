// The reader's page (the web's /you): who's signed in, the themes the feed
// leans on, sign-out and account deletion.
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Arrow } from '@/components/icons';
import { Page } from '@/components/page';
import { useToast } from '@/components/toast';
import { Eyebrow, Rise, Spinner, TextLink } from '@/components/ui';
import { backend, type Taste } from '@/lib/backend';
import { useSession } from '@/lib/session';
import { themeLabel } from '@shared/themes';
import { C, F, SITE, T, em } from '@/theme';

const ARMED_MS = 4000;

export default function You() {
  const { user } = useSession();
  const toast = useToast();
  const [taste, setTaste] = useState<Taste[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const disarm = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fresh every time the tab opens: a retune or a few likes may have moved it.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      backend
        .getTaste()
        .then((t) => alive && setTaste(t))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );
  useEffect(() => () => clearTimeout(disarm.current), []);

  const themes = (taste ?? []).filter((t) => t.fav);
  const max = Math.max(1, ...themes.map((t) => t.weight));

  // The guards take the reader back to the welcome screen.
  const signOut = () => backend.signOut();

  // Two taps: the first arms the button for a few seconds.
  async function deleteAccount() {
    if (!confirming) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setConfirming(true);
      disarm.current = setTimeout(() => setConfirming(false), ARMED_MS);
      return;
    }
    clearTimeout(disarm.current);
    setDeleting(true);
    try {
      await backend.deleteAccount();
    } catch (e) {
      toast((e as Error).message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <Page eyebrow="Reader">
      <Rise style={s.hello}>
        <Eyebrow>Signed in as</Eyebrow>
        <Text style={s.email} selectable>
          {user?.email}
        </Text>
      </Rise>

      <Rise delay={1} style={s.block}>
        <View style={s.blockHead}>
          <Text style={s.h2} accessibilityRole="header">
            Your taste
          </Text>
          <TextLink
            label="Retune"
            color={C.rose}
            size={14}
            onPress={() => router.push('/onboarding')}
            arrow={<Arrow color={C.rose} />}
          />
        </View>
        <Text style={s.note}>The themes you picked, plus any you keep liking. The bars show how strongly each one pulls.</Text>
        {taste === null ? (
          <Spinner />
        ) : (
          <View style={s.bars}>
            {themes.map((t, i) => (
              <Bar key={t.feature} label={themeLabel(t.feature)} share={Math.max(8, (t.weight / max) * 100)} delay={i * 40} />
            ))}
          </View>
        )}
      </Rise>

      <Rise delay={3} style={s.block}>
        <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8} style={s.outBtn}>
          <Text style={s.out}>Sign out</Text>
        </Pressable>
        <Pressable
          onPress={deleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityHint={confirming ? undefined : 'Tap twice to delete your account and everything kotes knows about you'}
          hitSlop={8}
          style={s.deleteBtn}>
          <Text style={[s.delete, confirming && s.armed]}>
            {deleting ? 'Deleting…' : confirming ? 'Tap again to delete everything' : 'Delete my account'}
          </Text>
        </Pressable>
        <Text style={T.fine}>
          kotes is for readers only. No posting, no followers, no noise.{' '}
          <Text style={s.underline} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} accessibilityRole="link">
            Privacy
          </Text>
        </Text>
        <Text style={[T.fine, s.version]}>kotes {Constants.expoConfig?.version}</Text>
      </Rise>
    </Page>
  );
}

/** One theme's pull, growing in from the left. */
function Bar({ label, share, delay }: { label: string; share: number; delay: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(withDelay(300 + delay, withTiming(1, { duration: 1100, easing: Easing.bezier(0.2, 0.8, 0.2, 1) })));
  }, [grow, delay]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));
  return (
    <View style={s.bar} accessible accessibilityLabel={`${label}, ${Math.round(share)}%`}>
      <Text style={s.label}>{label}</Text>
      <View style={s.track}>
        <Animated.View style={[s.fill, { width: `${share}%` }, fill]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hello: { paddingTop: 44, paddingBottom: 36 },
  email: { fontFamily: F.displayItalic, fontSize: 30, letterSpacing: em(30, -0.02), color: C.wine, marginTop: 10 },
  block: { borderTopWidth: 1, borderTopColor: C.ink12, paddingTop: 26, paddingBottom: 30 },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontFamily: F.display, fontSize: 26, letterSpacing: em(26, -0.02), color: C.wine },
  note: { fontFamily: F.readItalic, fontSize: 17, lineHeight: 23, color: C.ink60, marginTop: 6, marginBottom: 22 },
  bars: { gap: 14 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label: { width: 104, fontFamily: F.displayItalic, fontSize: 18, color: C.wine },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: C.ink06, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: C.rose, transformOrigin: 'left' },
  outBtn: { alignSelf: 'flex-start', paddingTop: 4, paddingBottom: 14 },
  out: { fontFamily: F.uiSemi, fontSize: 15, color: C.roseDeep },
  deleteBtn: { alignSelf: 'flex-start', paddingBottom: 18 },
  delete: { fontFamily: F.ui, fontSize: 13, color: C.ink40 },
  armed: { fontFamily: F.uiSemi, color: C.roseDeep },
  underline: { textDecorationLine: 'underline' },
  version: { marginTop: 10 },
});
