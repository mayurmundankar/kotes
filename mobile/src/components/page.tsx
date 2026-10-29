// A scrolling page with the wordmark top bar and room for the nav (`.page`).
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, Wordmark } from './ui';
import { C, GUTTER, NAV_H } from '@/theme';

export function Page({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={[s.page, { paddingTop: insets.top + 20, paddingBottom: NAV_H + insets.bottom + 32 }]}>
      <View style={s.topbar}>
        <Wordmark />
        <Eyebrow>{eyebrow}</Eyebrow>
      </View>
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: GUTTER },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
