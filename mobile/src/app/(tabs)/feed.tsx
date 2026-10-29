// The feed: an endless column of full-screen quotes, one per swipe, that
// learns from what the reader likes, keeps and lingers on (the web's /feed).
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ListViewToken } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setNavTone } from '@/components/nav';
import { QuoteCard, TONE, TONES, type Tone } from '@/components/quote-card';
import { ShareSheet } from '@/components/share-sheet';
import { useToast } from '@/components/toast';
import { Eyebrow, Spinner, Wordmark } from '@/components/ui';
import { backend, type Kind, type Quote } from '@/lib/backend';
import { C, F, GUTTER, NAV_H, em } from '@/theme';

type Item = { key: string; q: Quote };

const BATCH = 8;
const PREFETCH = 3; // load more when this close to the end
const RECENT = 40; // never repeat a quote within this many cards
const toneAt = (i: number): Tone => TONES[i % TONES.length];
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

export default function Feed() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const toast = useToast();
  // The window's height until the feed has measured itself (no blank first frame).
  const win = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const height = measured || win.height;
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [empty, setEmpty] = useState(false);
  const [failed, setFailed] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  const activeRef = useRef(0);
  const focusedRef = useRef(focused);
  const loading = useRef(false);
  const seq = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const recent = itemsRef.current.slice(-RECENT).map((i) => i.q.id);
      const next = await backend.getFeed(BATCH, recent);
      if (!next.length && !itemsRef.current.length) setEmpty(true);
      setFailed(false);
      setItems((prev) => [...prev, ...next.map((q) => ({ key: `${q.id}.${seq.current++}`, q }))]);
    } catch {
      setFailed(true);
      toast("Couldn't reach the library. Scroll to retry.");
    } finally {
      loading.current = false;
    }
  }, [toast]);

  useEffect(() => {
    if (!itemsRef.current.length) load();
  }, [load]);

  // Dwell: how long each quote held the screen. Paused while another tab is
  // open or the app is in the background.
  const dwell = useRef<{ id: number; since: number } | null>(null);
  const endDwell = useCallback(() => {
    if (dwell.current) backend.recordView(dwell.current.id, Date.now() - dwell.current.since);
    dwell.current = null;
  }, []);
  const startDwell = useCallback(() => {
    endDwell();
    const item = itemsRef.current[activeRef.current];
    if (item && focusedRef.current && AppState.currentState === 'active') dwell.current = { id: item.q.id, since: Date.now() };
  }, [endDwell]);

  useEffect(() => {
    focusedRef.current = focused;
    if (focused) startDwell();
    else endDwell();
  }, [focused, startDwell, endDwell]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return startDwell();
      endDwell();
      backend.flushViews();
    });
    return () => {
      sub.remove();
      endDwell();
    };
  }, [startDwell, endDwell]);

  // The viewability handler reaches the latest functions through refs.
  const startDwellRef = useRef(startDwell);
  const loadRef = useRef(load);
  useEffect(() => {
    startDwellRef.current = startDwell;
    loadRef.current = load;
  }, [startDwell, load]);
  // FlatList refuses a new handler after mount (even across a hot reload), so
  // it's held in state, which never changes.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const i = viewableItems[0]?.index;
    if (i == null || (i === activeRef.current && dwell.current)) return;
    activeRef.current = i;
    setActive(i);
    startDwellRef.current();
    if (i >= itemsRef.current.length - PREFETCH) loadRef.current();
  });

  const tone = toneAt(active);
  useEffect(() => {
    setNavTone(tone);
  }, [tone]);

  const setFlag = (id: number, kind: Kind, on: boolean) =>
    setItems((prev) => prev.map((i) => (i.q.id === id ? { ...i, q: { ...i.q, [kind === 'like' ? 'liked' : 'saved']: on } } : i)));

  const onReact = useCallback(
    async (q: Quote, kind: Kind, on: boolean) => {
      setFlag(q.id, kind, on);
      if (kind === 'save') toast(on ? 'Kept on your shelf' : 'Removed from your shelf');
      try {
        await backend.react(q.id, kind, on);
      } catch {
        setFlag(q.id, kind, !on);
        toast("That didn't save. Try again.");
      }
    },
    [toast],
  );

  // The sheet opens in the colour of the card it came from.
  const [sharing, setSharing] = useState<{ quote: Quote; tone: Tone } | null>(null);
  const onShare = useCallback((quote: Quote, tone: Tone) => setSharing({ quote, tone }), []);

  const dark = tone === 'wine' || tone === 'rose';
  const ink = TONE[tone].ink;

  return (
    <View style={s.feed} onLayout={(e) => setMeasured(e.nativeEvent.layout.height)}>
      {focused && <StatusBar style={dark ? 'light' : 'dark'} />}

      {items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={({ item, index }) => (
            <QuoteCard
              quote={item.q}
              tone={toneAt(index)}
              height={height}
              bottomInset={insets.bottom}
              onReact={onReact}
              onShare={onShare}
            />
          )}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          pagingEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          onViewableItemsChanged={onViewable}
          viewabilityConfig={VIEWABILITY}
          onEndReached={() => load()}
          onEndReachedThreshold={1.5}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            empty ? undefined : (
              <View style={[s.more, { height: height * 0.4, backgroundColor: TONE[toneAt(items.length)].bg, paddingBottom: NAV_H + insets.bottom }]}>
                <Spinner />
              </View>
            )
          }
        />
      )}

      <View pointerEvents="none" style={[s.head, { top: insets.top + 22 }]}>
        <Wordmark color={ink} dot={tone === 'rose' ? C.wine : C.rose} />
        <Eyebrow style={{ color: ink, opacity: 0.7 }}>For you</Eyebrow>
      </View>

      {empty ? (
        <View style={s.center}>
          <Eyebrow>The shelves are empty</Eyebrow>
          <Text style={s.endText}>No quotes in the library yet. Check back soon.</Text>
        </View>
      ) : (
        items.length === 0 &&
        (failed ? (
          <Pressable style={s.center} onPress={() => load()} accessibilityRole="button">
            <Text style={s.hint}>Couldn&apos;t reach the library.</Text>
            <Text style={s.retry}>Tap to retry</Text>
          </Pressable>
        ) : (
          <View style={s.center} pointerEvents="none">
            <Text style={s.hint}>Finding lines for you…</Text>
          </View>
        ))
      )}

      {items.length > 0 && active === 0 && <SwipeHint top={insets.top + 70} />}

      <ShareSheet quote={sharing?.quote ?? null} tone={sharing?.tone} onClose={() => setSharing(null)} />
    </View>
  );
}

function SwipeHint({ top }: { top: number }) {
  const reduceMotion = useReducedMotion();
  const k = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) k.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [k, reduceMotion]);
  const nudge = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * k.value, transform: [{ translateY: -6 * k.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[s.swipe, { top }, nudge]}>
      <Text style={s.swipeText} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
        Swipe up · double-tap to like
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  feed: { flex: 1, backgroundColor: C.paper },
  head: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: GUTTER },
  hint: { fontFamily: F.readItalic, fontSize: 20, color: C.ink60, textAlign: 'center' },
  retry: { fontFamily: F.uiSemi, fontSize: 14, color: C.rose },
  endText: { fontFamily: F.read, fontSize: 22, lineHeight: 22 * 1.35, maxWidth: 300, textAlign: 'center', color: C.wine },
  more: { alignItems: 'center', justifyContent: 'center' },
  swipe: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  swipeText: { fontFamily: F.uiSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.2), textTransform: 'uppercase', color: C.ink40 },
});
