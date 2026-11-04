// The morning quote's two faces: the one-time offer in the feed, and the
// setting on the You tab. Android's own permission prompt only ever follows a
// yes given here.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useToast } from './toast';
import { Button } from './ui';
import {
  DEFAULT_HOUR,
  HOURS,
  disableMorning,
  enableMorning,
  getMorning,
  hourLabel,
  openAndroidSettings,
  previewMorning,
  setMorningHour,
  type MorningState,
} from '@/lib/morning';
import { C, F, em, hang } from '@/theme';

const PREVIEW_RESET_MS = 5000;

function HourChips({ hour, onPick }: { hour: number; onPick: (hour: number) => void }) {
  return (
    <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Time of the morning quote">
      {HOURS.map((h) => {
        const on = h === hour;
        return (
          <Pressable
            key={h}
            onPress={() => onPick(h)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            hitSlop={4}
            style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && s.chipTextOn]}>{hourLabel(h)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Shown once, after a reader has settled in. Saying no costs nothing and it never returns. */
export function MorningOffer({ bottom, onClose }: { bottom: number; onClose: () => void }) {
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(withTiming(1, { duration: 320, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, [rise]);
  const motion = useAnimatedStyle(() => ({ opacity: rise.get(), transform: [{ translateY: (1 - rise.get()) * 24 }] }));

  const accept = async () => {
    setBusy(true);
    try {
      const state = await enableMorning(hour);
      toast(state.enabled ? `A line each morning, around ${hourLabel(hour)}` : 'Android said no. You can change this under You.');
    } catch {
      toast("That didn't work. You can try again under You.");
    }
    onClose();
  };

  return (
    <Animated.View style={[s.offer, { bottom }, motion]} accessibilityViewIsModal>
      <Text style={s.offerTitle} accessibilityRole="header">
        A line with your <Text style={s.em}>morning?</Text>
      </Text>
      <Text style={s.offerBody}>One quote a day, chosen from your taste. No sound, nothing else, and you can stop any time.</Text>
      <HourChips hour={hour} onPick={setHour} />
      <Button label={`Yes, around ${hourLabel(hour)}`} block busy={busy} onPress={accept} />
      <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={s.notNow} disabled={busy}>
        <Text style={s.notNowText}>Not now</Text>
      </Pressable>
    </Animated.View>
  );
}

/** The setting: always available, and always honest about what Android allows. */
export function MorningSetting() {
  const [state, setState] = useState<MorningState | null>(null);
  const [previewed, setPreviewed] = useState(false);
  const toast = useToast();
  // Android's prompt counts as leaving the app. While the reader's own change is
  // in flight, a check coming back from it mustn't overwrite the switch.
  const changing = useRef(false);

  const check = useCallback(() => {
    if (changing.current) return;
    getMorning()
      .then((next) => {
        if (!changing.current) setState(next);
      })
      .catch(() => {});
  }, []);
  // Coming back from Android's settings is when this is most likely to change.
  useFocusEffect(check);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => next === 'active' && check());
    return () => sub.remove();
  }, [check]);

  if (!state?.available) return null;

  const failed = () => toast("That didn't work. Try again.");
  // The switch moves with the finger; Android's answer settles it a moment later.
  const toggle = async (on: boolean) => {
    const before = state;
    changing.current = true;
    setState({ ...state, enabled: on, blocked: false });
    try {
      setState(await (on ? enableMorning(state.hour) : disableMorning()));
    } catch {
      setState(before);
      failed();
    } finally {
      changing.current = false;
    }
  };
  const pickHour = (hour: number) => {
    setState({ ...state, hour });
    setMorningHour(hour).catch(failed);
  };
  const preview = () => {
    setPreviewed(true);
    setTimeout(() => setPreviewed(false), PREVIEW_RESET_MS);
    previewMorning().catch(failed);
  };

  return (
    <View>
      <View style={s.settingHead}>
        <View style={s.settingText}>
          <Text style={s.h2} accessibilityRole="header">
            Morning quote
          </Text>
          <Text style={s.note}>One quote a day from your taste. No sound. If you stop opening kotes, it stops after two weeks.</Text>
        </View>
        <Switch
          value={state.enabled}
          onValueChange={toggle}
          accessibilityLabel="Morning quote"
          trackColor={{ false: C.ink12, true: C.rose }}
          thumbColor={C.paper}
        />
      </View>

      {state.blocked && (
        <View style={s.blocked}>
          <Text style={s.blockedText}>Notifications for kotes are off in Android&apos;s settings.</Text>
          <Pressable onPress={openAndroidSettings} accessibilityRole="link" hitSlop={8}>
            <Text style={s.action}>Open settings</Text>
          </Pressable>
        </View>
      )}

      {state.enabled && (
        <>
          <Text style={s.label}>Around</Text>
          <HourChips hour={state.hour} onPick={pickHour} />
          <Pressable onPress={preview} accessibilityRole="button" hitSlop={8} style={s.previewBtn} disabled={previewed}>
            <Text style={s.action}>{previewed ? 'Sent. Check your notifications.' : 'Send me one now'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink12 },
  chipOn: { backgroundColor: C.wine, borderColor: C.wine },
  chipText: { fontFamily: F.uiSemi, fontSize: 14, color: C.wine, fontVariant: ['tabular-nums'] },
  chipTextOn: { color: C.paper },
  offer: {
    position: 'absolute',
    left: 12,
    right: 12,
    padding: 22,
    gap: 14,
    borderRadius: 28,
    backgroundColor: C.paper,
    boxShadow: '0 20px 50px -14px rgba(42,7,17,0.55)',
  },
  offerTitle: { fontFamily: F.display, fontSize: 28, lineHeight: 31, letterSpacing: em(28, -0.025), color: C.wine, ...hang(28) },
  em: { fontFamily: F.displayItalic, color: C.rose },
  offerBody: { fontFamily: F.read, fontSize: 18, lineHeight: 24, color: C.ink60 },
  notNow: { alignSelf: 'center', paddingVertical: 4 },
  notNowText: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink60 },
  settingHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  settingText: { flex: 1 },
  h2: { fontFamily: F.display, fontSize: 26, letterSpacing: em(26, -0.02), color: C.wine },
  note: { fontFamily: F.readItalic, fontSize: 17, lineHeight: 23, color: C.ink60, marginTop: 6 },
  blocked: { marginTop: 16, gap: 6 },
  blockedText: { fontFamily: F.ui, fontSize: 13.5, lineHeight: 19, color: C.roseDeep },
  label: { fontFamily: F.uiSemi, fontSize: 11, letterSpacing: em(11, 0.18), textTransform: 'uppercase', color: C.ink40, marginTop: 20, marginBottom: 10 },
  previewBtn: { alignSelf: 'flex-start', marginTop: 16 },
  action: { fontFamily: F.uiSemi, fontSize: 14, color: C.rose },
});
