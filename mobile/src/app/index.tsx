// Welcome: the web's landing page, for readers who aren't signed in.
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Arrow } from '@/components/icons';
import { Button, Eyebrow, Rise, TextLink, Wordmark } from '@/components/ui';
import { C, F, GUTTER, SITE, T, em } from '@/theme';

const FAN = [
  { text: 'I dwell in Possibility.', theme: 'Hope', tone: 'wine', r: -11, x: -0.64 },
  { text: 'Forever is composed of nows.', theme: 'Time', tone: 'blush', r: 7, x: -0.36 },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', theme: 'Wit', tone: 'rose', r: -2, x: -0.5 },
] as const;

const STEPS = [
  { n: '01', title: 'Read.', body: 'An endless river of lines from poets, stoics, wits and the quietly heartbroken.' },
  { n: '02', title: 'Linger.', body: 'What you like, keep and linger on teaches kotes your taste. Nothing else does.' },
  { n: '03', title: 'Keep.', body: 'Save the ones that stay with you. A private shelf of words, always within reach.' },
];

const CARD_W = 252;
const FAN_H = 400;
const FLOAT_MS = 7000;

const openPrivacy = () => WebBrowser.openBrowserAsync(`${SITE}/privacy`);

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const stepsY = useRef(0);
  const display = Math.min(58, Math.max(44, width * 0.134));

  // One clock for the fan; each card floats on its own phase of it.
  // Held still when the reader has turned animations off.
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) clock.set(withRepeat(withTiming(1, { duration: FLOAT_MS, easing: Easing.linear }), -1));
  }, [clock, reduceMotion]);

  const begin = () => router.push('/login');

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={[s.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}>
      <Rise style={s.topbar}>
        <Wordmark />
        <Pressable onPress={begin} hitSlop={8} style={s.signin} accessibilityRole="button">
          <Text style={s.signinText}>Sign in</Text>
        </Pressable>
      </Rise>

      <View style={[s.hero, { paddingTop: height * 0.13 }]}>
        <Rise delay={1}>
          <Eyebrow>A reading app · for humans</Eyebrow>
        </Rise>
        <Rise delay={2}>
          <Text style={[T.title(display), { lineHeight: display }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            The feed that <Text style={T.em}>reads you</Text> back.
          </Text>
        </Rise>
        <Rise delay={3}>
          <Text style={T.lede}>Endless quotes from the minds worth keeping, quietly tuned, line by line, to what moves you.</Text>
        </Rise>
        <Rise delay={4} style={s.ctas}>
          <Button label="Begin reading" onPress={begin} />
          <TextLink
            label="How it works"
            onPress={() => scroll.current?.scrollTo({ y: stepsY.current - 24 })}
            arrow={<Arrow color={C.wine} />}
          />
        </Rise>
        <Rise delay={4}>
          <Text style={T.fine}>Free. Passwordless. No posts, no noise. Only reading.</Text>
        </Rise>
      </View>

      <View style={[s.fan, { marginHorizontal: -GUTTER }]} importantForAccessibility="no-hide-descendants">
        {FAN.map((q, i) => (
          <FanCard key={i} i={i} q={q} clock={clock} center={width / 2} />
        ))}
      </View>

      <View style={s.steps} onLayout={(e) => (stepsY.current = e.nativeEvent.layout.y)}>
        {STEPS.map((st) => (
          <View key={st.n} style={s.step}>
            <Text style={s.num}>{st.n}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{st.title}</Text>
              <Text style={s.stepBody}>{st.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.close}>
        <Text style={[T.title(44), s.closeTitle]} maxFontSizeMultiplier={1.3}>
          Some words{'\n'}
          <Text style={T.em}>find you.</Text>
        </Text>
        <Button label="Continue with email" block onPress={begin} />
        <Text style={T.fine}>No password, ever. We send a one-time code.</Text>
      </View>

      <View style={s.foot}>
        <Wordmark size={20} />
        <Text style={T.fine}>
          <Text style={s.underline} onPress={openPrivacy} accessibilityRole="link">
            Privacy
          </Text>{' '}
          · © 2026
        </Text>
      </View>
    </ScrollView>
  );
}

function FanCard({ i, q, clock, center }: { i: number; q: (typeof FAN)[number]; clock: SharedValue<number>; center: number }) {
  const phase = (i * 2200) / FLOAT_MS;
  const float = useAnimatedStyle(() => {
    // 0 → 1 → 0 over one loop, like the web's ease-in-out keyframes.
    const k = (1 - Math.cos(2 * Math.PI * ((clock.value + phase) % 1))) / 2;
    return { transform: [{ translateY: -12 * k }, { rotate: `${q.r * (1 - 0.2 * k)}deg` }] };
  });
  const tone = TONE[q.tone];
  return (
    <Animated.View style={[s.card, tone.card, { left: center + q.x * CARD_W }, float]}>
      <Text style={[s.mark, { color: tone.mark }]}>“</Text>
      <Text style={[s.cardText, { color: tone.ink }]}>{q.text}</Text>
      <Text style={[s.cardTheme, { color: tone.ink }]}>{q.theme}</Text>
    </Animated.View>
  );
}

const TONE = {
  rose: { card: { backgroundColor: C.rose, boxShadow: '0 30px 60px -24px rgba(194,31,72,0.55)' }, ink: C.paper, mark: C.paper },
  wine: { card: { backgroundColor: C.wine }, ink: C.roseSoft, mark: C.rose },
  blush: { card: { backgroundColor: C.blush, boxShadow: `inset 0 0 0 1px ${C.ink06}` }, ink: C.wine, mark: C.rose },
} as const;

const s = StyleSheet.create({
  page: { paddingHorizontal: GUTTER, backgroundColor: C.paper },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signin: { paddingVertical: 10, paddingHorizontal: 16, marginRight: -16 },
  signinText: { fontFamily: F.uiSemi, fontSize: 14, color: C.wine },
  hero: { gap: 22 },
  ctas: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 8 },
  fan: { height: FAN_H, marginTop: 72, marginBottom: 24 },
  card: {
    position: 'absolute',
    top: (FAN_H - 300) / 2,
    width: CARD_W,
    minHeight: 300,
    paddingTop: 30,
    paddingHorizontal: 26,
    paddingBottom: 26,
    borderRadius: 26,
    justifyContent: 'space-between',
    gap: 18,
    transformOrigin: '50% 90%',
  },
  mark: { fontFamily: F.display, fontSize: 64, lineHeight: 64 * 0.9, height: 28, overflow: 'visible' },
  cardText: { fontFamily: F.readMedium, fontSize: 26, lineHeight: 26 * 1.18, flex: 1 },
  cardTheme: { fontFamily: F.uiSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.2), textTransform: 'uppercase', opacity: 0.7 },
  steps: { borderTopWidth: 1, borderTopColor: C.ink12 },
  step: { flexDirection: 'row', gap: 8, paddingVertical: 26, borderBottomWidth: 1, borderBottomColor: C.ink12 },
  num: { width: 48, fontFamily: F.displayItalic, fontSize: 15, color: C.rose, paddingTop: 8 },
  stepTitle: { fontFamily: F.display, fontSize: 30, letterSpacing: em(30, -0.02), color: C.wine, marginBottom: 6 },
  stepBody: { fontFamily: F.read, fontSize: 19, lineHeight: 19 * 1.4, color: C.ink60 },
  close: { alignItems: 'center', gap: 18, paddingTop: 88, paddingBottom: 72 },
  closeTitle: { textAlign: 'center', lineHeight: 44, letterSpacing: em(44, -0.03), marginBottom: 14 },
  foot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.ink12,
  },
  underline: { textDecorationLine: 'underline' },
});
