// The bottom bar (the web's components/nav.tsx). On the feed it takes the
// tone of the quote card behind it; elsewhere it's paper.
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Person, Read, Shelf } from './icons';
import { C, F, NAV_H, em } from '@/theme';

export type NavTone = 'paper' | 'blush' | 'wine' | 'rose';

// The feed sets this as cards scroll by.
let tone: NavTone = 'paper';
const subs = new Set<() => void>();
export function setNavTone(next: NavTone) {
  if (next === tone) return;
  tone = next;
  subs.forEach((cb) => cb());
}
const useNavTone = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => tone,
  );

const ITEMS = {
  feed: { label: 'Read', Icon: Read },
  library: { label: 'Kept', Icon: Shelf },
  you: { label: 'You', Icon: Person },
} as const;

const TONES: Record<NavTone, { bg: string; border: string; ink: string; dot: string }> = {
  paper: { bg: 'rgba(255,246,247,0.94)', border: C.ink06, ink: C.wine, dot: C.rose },
  blush: { bg: 'rgba(253,236,240,0.94)', border: C.ink06, ink: C.wine, dot: C.rose },
  wine: { bg: 'rgba(42,7,17,0.9)', border: 'rgba(255,246,247,0.08)', ink: C.paper, dot: C.rose },
  rose: { bg: 'rgba(232,54,95,0.92)', border: 'rgba(255,246,247,0.16)', ink: C.paper, dot: C.paper },
};

export function Nav({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const feedTone = useNavTone();
  const active = state.routes[state.index]?.name;
  const t = TONES[active === 'feed' ? feedTone : 'paper'];

  return (
    <View
      accessibilityRole="tablist"
      style={[s.nav, { height: NAV_H + insets.bottom, paddingBottom: insets.bottom, backgroundColor: t.bg, borderTopColor: t.border }]}>
      {state.routes.map((route, i) => {
        const item = ITEMS[route.name as keyof typeof ITEMS];
        if (!item) return null;
        const on = i === state.index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (on) return;
              Haptics.selectionAsync().catch(() => {});
              navigateToTab(route.key);
            }}
            style={[s.item, { opacity: on ? 1 : 0.42 }]}>
            <item.Icon color={t.ink} />
            <Text style={[s.label, { color: t.ink }]} maxFontSizeMultiplier={1.3}>
              {item.label}
            </Text>
            <View style={[s.dot, on && { backgroundColor: t.dot }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { fontFamily: F.uiSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.16), textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
