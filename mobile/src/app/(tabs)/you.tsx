// The reader's page. Phase 3 adds the taste bars and account deletion.
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Arrow } from '@/components/icons';
import { Page } from '@/components/page';
import { Eyebrow, Rise, TextLink } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useSession } from '@/lib/session';
import { C, F, SITE, T } from '@/theme';

export default function You() {
  const { user } = useSession();

  return (
    <Page eyebrow="Reader">
      <Rise style={s.hello}>
        <Eyebrow>Signed in as</Eyebrow>
        <Text style={s.email} numberOfLines={2}>
          {user?.email}
        </Text>
      </Rise>

      <Rise delay={1} style={s.block}>
        <View style={s.blockHead}>
          <Text style={s.h2}>Your taste</Text>
          <TextLink label="Retune" onPress={() => router.push('/onboarding')} arrow={<Arrow color={C.wine} />} />
        </View>
      </Rise>

      <Rise delay={3} style={s.block}>
        {/* The guards return the reader to the welcome screen. */}
        <Pressable onPress={() => backend.signOut()} style={s.out} accessibilityRole="button">
          <Text style={s.outText}>Sign out</Text>
        </Pressable>
        <Text style={T.fine}>
          kotes is for readers only. No posting, no followers, no noise.{' '}
          <Text style={s.underline} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} accessibilityRole="link">
            Privacy
          </Text>
        </Text>
      </Rise>
    </Page>
  );
}

const s = StyleSheet.create({
  hello: { marginTop: 28, gap: 8 },
  email: { fontFamily: F.display, fontSize: 30, color: C.wine },
  block: { marginTop: 40, gap: 14 },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontFamily: F.display, fontSize: 26, color: C.wine },
  out: { height: 52, borderRadius: 999, borderWidth: 1, borderColor: C.ink12, alignItems: 'center', justifyContent: 'center' },
  outText: { fontFamily: F.uiSemi, fontSize: 15, color: C.wine },
  underline: { textDecorationLine: 'underline' },
});
