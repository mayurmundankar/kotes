// A reader's taste as true shares (the web's components/taste-breakdown.tsx): a
// headline, one bar split by share, then each theme with its percentage.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { TASTE_KIND_LABEL, percentLabel, tasteColor, tasteLead, tasteShares } from '@shared/taste';
import { themeLabel } from '@shared/themes';
import type { Taste } from '@/lib/backend';
import { C, F, em } from '@/theme';

export function TasteBreakdown({ taste }: { taste: Taste[] }) {
  const { shares, quiet } = tasteShares(taste);
  const lead = tasteLead(shares);

  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(withDelay(250, withTiming(1, { duration: 1100, easing: Easing.bezier(0.2, 0.8, 0.2, 1) })));
  }, [grow]);
  const reveal = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));

  if (!lead) {
    return <Text style={s.empty}>Still learning your taste. Like or keep a few quotes and it will show here.</Text>;
  }

  return (
    <View>
      <Text style={s.headline} accessibilityRole="header">
        {lead === 'Evenly spread' ? (
          <Text style={s.em}>Evenly spread</Text>
        ) : (
          <>
            {lead} <Text style={s.em}>{themeLabel(shares[0].feature).toLowerCase()}</Text>
          </>
        )}
      </Text>

      <Animated.View style={[s.split, reveal]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {shares.map((t, i) => (
          <View key={t.feature} style={[s.part, { flexGrow: t.fraction, backgroundColor: tasteColor(i) }]} />
        ))}
      </Animated.View>

      <View style={s.rows}>
        {shares.map((t, i) => (
          <View
            key={t.feature}
            style={s.row}
            accessible
            accessibilityLabel={`${themeLabel(t.feature)}, ${percentLabel(t.percent)} of your taste, ${TASTE_KIND_LABEL[t.kind]}`}>
            <View style={[s.dot, { backgroundColor: tasteColor(i) }]} />
            <Text style={s.label} numberOfLines={1}>
              {themeLabel(t.feature)}
            </Text>
            <Text style={s.kind}>{TASTE_KIND_LABEL[t.kind]}</Text>
            <Text style={s.percent}>{percentLabel(t.percent)}</Text>
          </View>
        ))}
      </View>

      {quiet.length > 0 && <Text style={s.foot}>Picked, but quiet for now: {quiet.map(themeLabel).join(', ')}.</Text>}
      <Text style={s.foot}>Picked and learned themes fill about 85% of your feed. The rest goes to exploring.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  empty: { fontFamily: F.readItalic, fontSize: 18, lineHeight: 24, color: C.ink60 },
  headline: { fontFamily: F.display, fontSize: 32, lineHeight: 36, letterSpacing: em(32, -0.025), color: C.wine, paddingBottom: 4, marginBottom: 12 },
  em: { fontFamily: F.displayItalic, color: C.rose },
  split: { flexDirection: 'row', gap: 2, height: 12, borderRadius: 6, overflow: 'hidden', transformOrigin: 'left' },
  part: { flexBasis: 2, minWidth: 2 },
  rows: { marginTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.ink12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flexShrink: 1, fontFamily: F.displayItalic, fontSize: 19, color: C.wine },
  kind: { flex: 1, fontFamily: F.ui, fontSize: 11.5, letterSpacing: em(11.5, 0.02), color: C.ink40 },
  percent: { fontFamily: F.uiSemi, fontSize: 15, color: C.wine, fontVariant: ['tabular-nums'] },
  foot: { fontFamily: F.ui, fontSize: 12.5, lineHeight: 18, color: C.ink60, marginTop: 14 },
});
