// Phase 2 builds the full-screen quote feed here.
import { StyleSheet, Text, View } from 'react-native';

import { Page } from '@/components/page';
import { Spinner } from '@/components/ui';
import { C, F } from '@/theme';

export default function Feed() {
  return (
    <Page eyebrow="For you">
      <View style={s.center}>
        <Spinner />
        <Text style={s.hint}>Finding lines for you…</Text>
      </View>
    </Page>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  hint: { fontFamily: F.readItalic, fontSize: 18, color: C.ink60 },
});
