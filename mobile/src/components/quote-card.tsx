// One full-screen quote (the web's components/quote-card.tsx): its tone,
// the text fitted to the card, double-tap to like, and like / keep / share.
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Bookmark, Heart, Share } from './icons';
import type { Kind, Quote } from '@/lib/backend';
import { themeLabel } from '@shared/themes';
import { C, F, GUTTER, NAV_H, em } from '@/theme';

export const TONES = ['paper', 'wine', 'blush', 'rose'] as const;
export type Tone = (typeof TONES)[number];

// One hue, four depths.
export const TONE: Record<Tone, { bg: string; ink: string; accent: string; soft: string }> = {
  paper: { bg: C.paper, ink: C.wine, accent: C.rose, soft: C.ink60 },
  blush: { bg: C.blush, ink: C.wine, accent: C.rose, soft: C.ink60 },
  rose: { bg: C.rose, ink: C.paper, accent: C.wine, soft: 'rgba(255,246,247,0.78)' },
  wine: { bg: C.wine, ink: C.paper, accent: C.rose, soft: 'rgba(246,195,207,0.7)' },
};

const sizeFor = (text: string) => {
  const n = text.length;
  if (n < 50) return 40;
  if (n < 90) return 34;
  if (n < 140) return 30;
  if (n < 200) return 27;
  return 24;
};
const MIN_SIZE = 18;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const PAD_TOP = 88;

type Props = {
  quote: Quote;
  tone: Tone;
  height: number;
  bottomInset: number;
  onReact: (q: Quote, kind: Kind, on: boolean) => void;
  onShare: (q: Quote, tone: Tone) => void;
};

export const QuoteCard = memo(function QuoteCard({ quote, tone, height, bottomInset, onReact, onShare }: Props) {
  const t = TONE[tone];
  const padBottom = NAV_H + bottomInset + 64;
  const room = height - PAD_TOP - padBottom;
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Start from a size that suits the quote's length, then shrink until it
  // fits the card: short screens and large system text would otherwise clip it.
  // Hidden until it fits, so it never flashes at the wrong size. When the
  // space changes, the text block is remounted (key) so it always reports a
  // fresh layout; a resize's own layout event can arrive before the reset.
  const { width } = useWindowDimensions();
  const key = `${width}x${room}:${quote.text}`;
  const [fit, setFit] = useState({ key, size: sizeFor(quote.text), done: false });
  if (fit.key !== key) setFit({ key, size: sizeFor(quote.text), done: false });
  // A shrink that happens to leave the height unchanged sends no new layout.
  useEffect(() => {
    if (fit.done) return;
    const t = setTimeout(() => setFit((f) => ({ ...f, done: true })), 400);
    return () => clearTimeout(t);
  }, [fit]);
  const onInnerLayout = (h: number) => {
    if (fit.done) return;
    if (h <= room || fit.size <= MIN_SIZE) return setFit((f) => ({ ...f, done: true }));
    // Text area scales with size², so jump close in one step, then nudge.
    const next = Math.max(MIN_SIZE, Math.min(fit.size - 1, Math.floor(fit.size / Math.sqrt(h / room))));
    setFit((f) => ({ ...f, size: next }));
  };

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    runOnJS: true,
    onActivate: (e) => {
      const id = Date.now();
      setBursts((b) => [...b, { id, x: e.x, y: e.y }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!quote.liked) onReact(quote, 'like', true);
    },
  });

  return (
    <View style={[s.card, { height, backgroundColor: t.bg, paddingBottom: padBottom }]}>
      <GestureDetector gesture={doubleTap}>
        <View style={StyleSheet.absoluteFill} accessible={false} />
      </GestureDetector>

      <View
        key={key}
        pointerEvents="none"
        style={[s.inner, { opacity: fit.done ? 1 : 0 }]}
        onLayout={(e) => onInnerLayout(e.nativeEvent.layout.height)}>
        <Text style={[s.mark, { color: t.accent }]} accessibilityElementsHidden importantForAccessibility="no">
          “
        </Text>
        <Text
          style={[s.text, { color: t.ink, fontSize: fit.size, lineHeight: fit.size * 1.12, letterSpacing: em(fit.size, -0.012) }]}
          accessibilityRole="text">
          {quote.text}
        </Text>
        {/* Authors stay hidden: the words have to stand on their own. */}
        <View style={[s.dash, { backgroundColor: t.accent }]} />
      </View>

      <View pointerEvents="none" style={[s.tags, { bottom: NAV_H + bottomInset + 26 }]}>
        <Text style={[s.num, { color: t.accent }]}>N° {String(quote.id).padStart(3, '0')}</Text>
        {quote.tags.map((tag) => (
          <Text key={tag} style={[s.tag, { color: t.soft }]}>
            {themeLabel(tag)}
          </Text>
        ))}
      </View>

      <View style={[s.actions, { bottom: NAV_H + bottomInset + 12 }]}>
        <Act
          on={quote.liked}
          label={quote.liked ? 'Unlike' : 'Like'}
          onPress={() => onReact(quote, 'like', !quote.liked)}>
          <Heart filled={quote.liked} color={quote.liked ? t.accent : t.ink} />
        </Act>
        <Act
          on={quote.saved}
          label={quote.saved ? 'Remove from kept' : 'Keep'}
          onPress={() => onReact(quote, 'save', !quote.saved)}>
          <Bookmark filled={quote.saved} color={quote.saved ? t.accent : t.ink} />
        </Act>
        <Act label="Share" onPress={() => onShare(quote, tone)}>
          <Share color={t.ink} />
        </Act>
      </View>

      {bursts.map((b) => (
        <Burst key={b.id} x={b.x} y={b.y} color={t.accent} />
      ))}
    </View>
  );
});

/** A 48pt action button: squeezes when pressed, pops when it turns on. */
function Act({ on, label, onPress, children }: { on?: boolean; label: string; onPress: () => void; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) scale.set(withSequence(withTiming(1.28, { duration: 180, easing: EASE }), withTiming(1, { duration: 270, easing: EASE })));
    was.current = on;
  }, [on, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onPressIn={() => scale.set(withTiming(0.82, { duration: 120 }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 350, easing: EASE }))}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on === undefined ? undefined : { selected: on }}
      style={s.act}>
      <Animated.View style={pop}>{children}</Animated.View>
    </Pressable>
  );
}

/** The heart that blooms where you double-tapped, then floats away. */
function Burst({ x, y, color }: { x: number; y: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 900, easing: EASE });
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.25, 0.55, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(p.value, [0, 0.55, 1], [0, 0, -96]) },
      { scale: interpolate(p.value, [0, 0.25, 0.55, 1], [0.2, 1.15, 0.95, 0.9]) },
      { rotate: `${interpolate(p.value, [0, 0.25], [-14, -6], 'clamp')}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[s.burst, { left: x - 48, top: y - 48 }, style]}>
      <Heart size={96} filled color={color} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { justifyContent: 'center', paddingTop: PAD_TOP, paddingHorizontal: GUTTER, overflow: 'hidden' },
  inner: { paddingRight: 36 },
  mark: { fontFamily: F.display, fontSize: 120, lineHeight: 120 * 0.9, height: 52, marginLeft: -6, overflow: 'visible' },
  text: { fontFamily: F.readMedium },
  dash: { width: 28, height: 1, marginTop: 30 },
  tags: { position: 'absolute', left: GUTTER, right: 80, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 14 },
  num: { fontFamily: F.displayItalic, fontSize: 13, letterSpacing: em(13, 0.02) },
  tag: { fontFamily: F.uiSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.18), textTransform: 'uppercase' },
  actions: { position: 'absolute', right: 12, gap: 4 },
  act: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute' },
});
