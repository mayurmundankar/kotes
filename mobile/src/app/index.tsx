// Welcome: the first screen for readers who aren't signed in. One screen with
// no scrolling: swipe a deck of quotes, and each card explains a bit of kotes.
import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button, Wordmark } from '@/components/ui';
import { C, F, GUTTER, SITE, T, em, hang } from '@/theme';

const DECK = [
  {
    text: 'I dwell in Possibility.',
    author: 'Emily Dickinson',
    theme: 'Hope',
    card: C.rose,
    ink: C.paper,
    mark: C.paper,
    stage: C.wine,
    title: ['The feed that ', 'reads you', ' back.'],
    body: 'Endless quotes from the minds worth keeping, quietly tuned to what moves you.',
  },
  {
    text: 'Forever is composed of nows.',
    author: 'Emily Dickinson',
    theme: 'Time',
    card: C.blush,
    ink: C.wine,
    mark: C.rose,
    stage: C.rose,
    title: ['Linger, and ', 'it learns', '.'],
    body: 'What you like, keep and linger on teaches kotes your taste. Nothing else does.',
  },
  {
    text: 'We are all in the gutter, but some of us are looking at the stars.',
    author: 'Oscar Wilde',
    theme: 'Wit',
    card: C.wine,
    ink: C.roseSoft,
    mark: C.rose,
    stage: C.roseSoft,
    title: ['Keep what ', 'stays', '.'],
    body: 'Save the ones that stay with you. A private shelf of words, always within reach.',
  },
] as const;

const LAST = DECK.length - 1;
const STEPS = DECK.map((_, i) => i);
const STAGES = DECK.map((d) => d.stage);
// Dark stages need the status bar and wordmark in a light ink.
const DARK_STAGE = [true, true, false];
const SPRING = { damping: 19, stiffness: 170, mass: 0.8 };

const openPrivacy = () => WebBrowser.openBrowserAsync(`${SITE}/privacy`);

export default function Welcome() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  // The sheet's copy is fixed-height so the deck doesn't jump between cards.
  const textScale = Math.min(fontScale, 1.15);
  const copyHeight = Math.round(158 * textScale);
  const sheetHeight = 24 + copyHeight + 20 + 10 + 20 + 56 + 14 + Math.round(18 * textScale) + 16 + insets.bottom;

  // What's left above the sheet (which overlaps it by its rounded corners).
  const headerHeight = insets.top + 56;
  const room = height - sheetHeight - headerHeight + 8;
  const cardWidth = Math.min(width * 0.76, (room - 34) * 0.86);
  const cardHeight = Math.max(180, Math.min(room - 34, cardWidth * 1.22));
  const titleSize = Math.min(36, Math.max(28, width * 0.088));

  // 0, 1, 2 at rest and everything between while dragging: every animation on
  // this screen follows it, so the whole screen moves under the finger.
  const progress = useSharedValue(0);
  const start = useSharedValue(0);

  // One small nudge shows the card can be moved, unless motion is turned off.
  useEffect(() => {
    if (reduceMotion) return;
    progress.set(withDelay(1500, withSequence(withTiming(0.14, { duration: 320 }), withSpring(0, SPRING))));
  }, [progress, reduceMotion]);

  const onStep = (next: number) => {
    setStep(next);
    Haptics.selectionAsync().catch(() => {});
  };
  useAnimatedReaction(
    () => Math.round(progress.value),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(onStep, now);
    },
  );

  const swipe = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onBegin: () => {
      'worklet';
      start.set(progress.get());
    },
    onUpdate: (e) => {
      'worklet';
      const next = start.get() - e.translationX / (width * 0.7);
      // A little give at both ends of the deck.
      progress.set(Math.max(-0.14, Math.min(LAST + 0.14, next)));
    },
    onDeactivate: (e) => {
      'worklet';
      const from = Math.round(start.get());
      // From the gesture's own totals: a quick flick can end before any update ran.
      const dragged = -e.translationX / (width * 0.7);
      // A flick carries the card further, but never against the drag's direction.
      const flick = -(e.velocityX / width) * 0.18;
      const flung = Math.round(start.get() + dragged + (flick * dragged > 0 ? flick : 0));
      const to = Math.max(0, Math.min(LAST, Math.max(from - 1, Math.min(from + 1, flung))));
      progress.set(withSpring(to, SPRING));
    },
  });

  const stageColor = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, STEPS, STAGES),
  }));

  const begin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/login');
  };

  return (
    <Animated.View style={[s.screen, stageColor]}>
      {focused && <StatusBar style={DARK_STAGE[step] ? 'light' : 'dark'} />}

      <GestureDetector gesture={swipe}>
        <View style={s.stage} accessible={false}>
          <View style={[s.header, { paddingTop: insets.top, height: headerHeight }]}>
            <Wordmark size={24} color={DARK_STAGE[step] ? C.paper : C.wine} dot={step === 1 ? C.wine : C.rose} />
          </View>
          <View style={s.deck} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {DECK.map((d, i) => (
              <DeckCard key={d.text} i={i} d={d} progress={progress} width={cardWidth} height={cardHeight} screen={width} />
            ))}
          </View>
        </View>
      </GestureDetector>

      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={{ height: copyHeight }}>
          {DECK.map((d, i) => (
            <Copy key={d.text} i={i} d={d} progress={progress} current={step === i} titleSize={titleSize} />
          ))}
        </View>

        <View style={s.dots}>
          {DECK.map((d, i) => (
            <Dot key={d.text} i={i} progress={progress} onPress={() => progress.set(withSpring(i, SPRING))} />
          ))}
        </View>

        <Button label="Get started" block onPress={begin} />

        <Text style={s.fine} maxFontSizeMultiplier={1.15}>
          No passwords, just an emailed code.{' '}
          <Text style={s.underline} onPress={openPrivacy} accessibilityRole="link">
            Privacy
          </Text>
        </Text>
      </View>
    </Animated.View>
  );
}

type Item = (typeof DECK)[number];

/** A card in the pile: swiped away to the left, or waiting behind the top one. */
function DeckCard({
  i,
  d,
  progress,
  width,
  height,
  screen,
}: {
  i: number;
  d: Item;
  progress: SharedValue<number>;
  width: number;
  height: number;
  screen: number;
}) {
  const motion = useAnimatedStyle(() => {
    const offset = i - progress.value;
    if (offset < 0) {
      return { transform: [{ translateX: offset * screen * 1.15 }, { rotate: `${offset * 14}deg` }], opacity: 1 };
    }
    return {
      transform: [{ translateX: offset * 16 }, { translateY: offset * 6 }, { rotate: `${offset * 5}deg` }, { scale: 1 - offset * 0.07 }],
      opacity: interpolate(offset, [1.5, 2.2], [1, 0], Extrapolation.CLAMP),
    };
  });
  // Short quotes run large, so every card feels full.
  const size = width * (d.text.length < 30 ? 0.15 : d.text.length < 60 ? 0.135 : 0.108);

  return (
    <Animated.View style={[s.card, { width, height, backgroundColor: d.card, zIndex: DECK.length - i }, motion]}>
      <Text style={[s.mark, { color: d.mark }]}>“</Text>
      <View style={s.cardBody}>
        <Text
          style={[s.cardText, hang(size), { color: d.ink, fontSize: size, lineHeight: size * 1.14, letterSpacing: em(size, -0.012) }]}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={7}
          maxFontSizeMultiplier={1}>
          {d.text}
        </Text>
      </View>
      <View style={s.cardFoot}>
        <Text style={[s.author, { color: d.ink }]} numberOfLines={1} maxFontSizeMultiplier={1}>
          {d.author}
        </Text>
        <Text style={[s.theme, { color: d.ink }]} maxFontSizeMultiplier={1}>
          {d.theme}
        </Text>
      </View>
    </Animated.View>
  );
}

/** One step's words. All three share the space and cross-fade with the drag. */
function Copy({
  i,
  d,
  progress,
  current,
  titleSize,
}: {
  i: number;
  d: Item;
  progress: SharedValue<number>;
  current: boolean;
  titleSize: number;
}) {
  const motion = useAnimatedStyle(() => {
    const away = i - progress.value;
    return {
      opacity: interpolate(Math.abs(away), [0, 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: away * 28 }],
    };
  });
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, motion]}
      pointerEvents="none"
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'yes' : 'no-hide-descendants'}>
      <Text
        style={[T.title(titleSize), { lineHeight: titleSize * 1.06 }]}
        maxFontSizeMultiplier={1.15}
        accessibilityRole="header">
        {d.title[0]}
        <Text style={T.em}>{d.title[1]}</Text>
        {d.title[2]}
      </Text>
      <Text style={s.body} maxFontSizeMultiplier={1.15}>
        {d.body}
      </Text>
    </Animated.View>
  );
}

function Dot({ i, progress, onPress }: { i: number; progress: SharedValue<number>; onPress: () => void }) {
  const motion = useAnimatedStyle(() => {
    const near = interpolate(Math.abs(i - progress.value), [0, 1], [1, 0], Extrapolation.CLAMP);
    return {
      width: 8 + near * 16,
      backgroundColor: interpolateColor(near, [0, 1], [C.ink12, C.rose]),
    };
  });
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Card ${i + 1} of ${DECK.length}`}>
      <Animated.View style={[s.dot, motion]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  stage: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'center' },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 26 },
  card: {
    position: 'absolute',
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderRadius: 28,
    boxShadow: '0 24px 50px -22px rgba(42,7,17,0.55)',
  },
  mark: { fontFamily: F.display, fontSize: 56, lineHeight: 50, height: 30 },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardText: { fontFamily: F.readMedium },
  cardFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  author: { flex: 1, fontFamily: F.readItalic, fontSize: 15, opacity: 0.85 },
  theme: { fontFamily: F.uiSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.2), textTransform: 'uppercase', opacity: 0.7 },
  sheet: {
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: GUTTER,
    backgroundColor: C.paper,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 10,
  },
  body: { fontFamily: F.read, fontSize: 18.5, lineHeight: 18.5 * 1.32, color: C.ink60, marginTop: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  fine: { ...T.fine, textAlign: 'center', marginTop: 14 },
  underline: { textDecorationLine: 'underline' },
});
