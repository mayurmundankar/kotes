// Phase 3 builds the Kept / Liked shelf here.
import { StyleSheet, Text } from 'react-native';

import { Page } from '@/components/page';
import { Rise } from '@/components/ui';
import { T } from '@/theme';

export default function Library() {
  return (
    <Page eyebrow="Your shelf">
      <Rise>
        <Text style={[T.title(44), s.title]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
          Words that <Text style={T.em}>stayed.</Text>
        </Text>
      </Rise>
    </Page>
  );
}

const s = StyleSheet.create({
  title: { marginTop: 28 },
});
