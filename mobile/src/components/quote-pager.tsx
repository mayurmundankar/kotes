// One full-screen page per swipe, moved by the finger on the UI thread. The whole
// decision is here rather than in a scroll view's paging, whose predicted travel
// let quick flicks that fell short of halfway snap back to the same quote.
import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Either is enough to move on: a short drag, or a quick flick of any length.
const DRAG_TO_TURN = 0.06; // of a page
const FLICK_TO_TURN = 280; // points per second
// Quick and without a bounce past the page.
const SPRING = { damping: 34, stiffness: 420, mass: 0.7, overshootClamping: true };
// Pages kept mounted around the current one, so a run of flicks never shows a gap.
const BEHIND = 2;
const AHEAD = 3;

export type PagerHandle = { goTo: (page: number) => void };

type Props<T> = {
  ref?: Ref<PagerHandle>;
  items: T[];
  height: number;
  keyOf: (item: T) => string;
  renderPage: (item: T, index: number) => ReactNode;
  /** Shown past the last page while more are on the way. */
  footer?: ReactNode;
  onPage: (page: number) => void;
  /** A swipe past the last page: a chance to load more. */
  onEnd: () => void;
};

export function QuotePager<T>({ ref, items, height, keyOf, renderPage, footer, onPage, onEnd }: Props<T>) {
  const [page, setPage] = useState(0);
  const position = useSharedValue(0);
  const from = useSharedValue(0);
  const fromTouch = useSharedValue(0);
  const last = useSharedValue(Math.max(items.length - 1, 0));

  useEffect(() => {
    last.set(Math.max(items.length - 1, 0));
  }, [last, items.length]);

  useImperativeHandle(ref, () => ({ goTo: (to) => position.set(withSpring(to, SPRING)) }), [position]);

  const reached = (next: number) => {
    setPage(next);
    onPage(next);
  };
  useAnimatedReaction(
    () => Math.round(position.get()),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(reached, now);
    },
  );

  const swipe = usePanGesture({
    activeOffsetY: [-8, 8],
    failOffsetX: [-32, 32],
    onActivate: (e) => {
      'worklet';
      from.set(position.get());
      fromTouch.set(e.translationY);
    },
    onUpdate: (e) => {
      'worklet';
      const next = from.get() - (e.translationY - fromTouch.get()) / height;
      const end = last.get();
      // Resists past either end.
      position.set(next < 0 ? next * 0.3 : next > end ? end + (next - end) * 0.3 : next);
    },
    onDeactivate: (e) => {
      'worklet';
      const start = Math.round(from.get());
      const dragged = from.get() - (e.translationY - fromTouch.get()) / height - start;
      // A flick decides by its direction, even against the way the finger came.
      const turn =
        e.velocityY < -FLICK_TO_TURN ? 1 : e.velocityY > FLICK_TO_TURN ? -1 : dragged > DRAG_TO_TURN ? 1 : dragged < -DRAG_TO_TURN ? -1 : 0;
      const end = last.get();
      if (turn > 0 && start >= end) scheduleOnRN(onEnd);
      const to = Math.max(0, Math.min(end, start + turn));
      position.set(withSpring(to, { ...SPRING, velocity: -e.velocityY / height }));
    },
  });

  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * height }] }));

  const first = Math.max(0, page - BEHIND);
  return (
    <GestureDetector gesture={swipe}>
      <View style={s.frame} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, slide]}>
          {items.slice(first, page + AHEAD + 1).map((item, i) => (
            <View key={keyOf(item)} style={[s.page, { top: (first + i) * height, height }]}>
              {renderPage(item, first + i)}
            </View>
          ))}
          {footer && <View style={[s.page, { top: items.length * height }]}>{footer}</View>}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute', left: 0, right: 0 },
});
