// A scrolling page with the wordmark top bar and room for the nav (`.page`).
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, Wordmark } from './ui';
import { C, GUTTER, NAV_H } from '@/theme';

export function TopBar({ eyebrow }: { eyebrow: string }) {
  return (
    <View style={s.topbar}>
      <Wordmark />
      <Eyebrow>{eyebrow}</Eyebrow>
    </View>
  );
}

/** Padding for a tab page: below the status bar, clear of the nav. */
export function usePagePadding() {
  const insets = useSafeAreaInsets();
  return { paddingTop: insets.top + 20, paddingBottom: NAV_H + insets.bottom + 32, paddingHorizontal: GUTTER };
}

export function Page({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  const padding = usePagePadding();
  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={[s.page, padding]}>
      <TopBar eyebrow={eyebrow} />
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1 },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
