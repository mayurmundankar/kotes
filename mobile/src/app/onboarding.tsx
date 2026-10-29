// "What moves you?": pick at least three themes. Also the Retune screen for
// readers who've already onboarded (from You).
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { Button, Eyebrow, Rise, Wordmark } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useSession } from '@/lib/session';
import { THEMES } from '@shared/themes';
import { C, F, GUTTER, T, em } from '@/theme';

const MIN = 3;

export default function Onboarding() {
  const { onboarded, markOnboarded } = useSession();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Retuning: start from the themes the reader already leans towards.
  useEffect(() => {
    if (!onboarded) return;
    backend
      .getTaste()
      .then((t) => {
        // Readers from before picks were recorded start from their current themes.
        const picks = t.some((x) => x.picked) ? t.filter((x) => x.picked) : t.filter((x) => x.fav);
        setPicked(picks.map((x) => x.feature));
      })
      .catch(() => {});
  }, [onboarded]);

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  async function done() {
    setBusy(true);
    try {
      await backend.setTastes(picked);
      markOnboarded();
      router.replace('/feed');
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  }

  const left = MIN - picked.length;
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 140 }]}>
        <View style={s.topbar}>
          <Wordmark />
          <Eyebrow>{onboarded ? 'Retune' : 'Welcome'}</Eyebrow>
        </View>

        <Rise delay={1}>
          <Text style={[T.title(50), { marginTop: height * 0.07 }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            What <Text style={T.em}>moves</Text> you?
          </Text>
        </Rise>
        <Rise delay={2}>
          <Text style={s.sub}>Pick at least three. It&apos;s only a first guess. kotes keeps learning from every line you keep.</Text>
        </Rise>

        <Rise delay={3} style={s.chips}>
          {THEMES.map((t) => {
            const on = picked.includes(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => toggle(t.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${t.label}: ${t.line}`}
                style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}>
                <Text style={[s.chipLabel, on && { color: C.paper }]}>{t.label}</Text>
                <Text style={[s.chipLine, on && { color: C.paper }]}>{t.line}</Text>
              </Pressable>
            );
          })}
        </Rise>
      </ScrollView>

      <LinearGradient
        colors={['rgba(255,246,247,0)', C.paper, C.paper]}
        locations={[0, 0.38, 1]}
        style={[s.dock, { paddingBottom: insets.bottom + 20 }]}
        pointerEvents="box-none">
        <Button
          block
          busy={busy}
          disabled={left > 0 || busy}
          onPress={done}
          label={left > 0 ? `Pick ${left} more` : 'Start reading'}
        />
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: GUTTER },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { fontFamily: F.read, fontSize: 20, lineHeight: 28, color: C.ink60, marginTop: 16, marginBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    gap: 2,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 15,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: C.ink12,
  },
  chipOn: { backgroundColor: C.rose, borderColor: C.rose },
  chipLabel: { fontFamily: F.displayItalic, fontSize: 19, color: C.wine },
  chipLine: { fontFamily: F.ui, fontSize: 11.5, letterSpacing: em(11.5, 0.01), color: C.wine, opacity: 0.6 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: GUTTER },
});
