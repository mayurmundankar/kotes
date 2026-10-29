// The web's shared building blocks (globals.css): wordmark, eyebrow, buttons,
// the spinner and the "rise" entrance.
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { C, F, T, em } from '@/theme';

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

export function Wordmark({ size = 26, color = C.wine }: { size?: number; color?: string }) {
  return (
    <Text style={[T.wordmark, { fontSize: size, letterSpacing: em(size, -0.02), color }]} accessibilityRole="header">
      kotes<Text style={{ fontFamily: F.display, color: C.rose }}>.</Text>
    </Text>
  );
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.eyebrow, style]}>{children}</Text>;
}

const RISE = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
});

/**
 * Fades and lifts in, like the web's `.rise` (d1–d4 are 40 ms steps). Skipped
 * in the web preview, where Reanimated's entering animations leave the view
 * hidden; it's only there for checking layouts.
 */
export function Rise({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Animated.View entering={Platform.OS === 'web' ? undefined : RISE.duration(450).delay(delay * 40)} style={style}>
      {children}
    </Animated.View>
  );
}

export function Spinner({ color = C.rose, track = C.ink12, size = 22 }: { color?: string; track?: string; size?: number }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: track, borderTopColor: color },
        spin,
      ]}
    />
  );
}

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  busy?: boolean;
  block?: boolean;
  ink?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The rose pill (`.btn`): shrinks a touch when pressed, fades when disabled. */
export function Button({ label, busy, block, ink, disabled, style, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        block && s.block,
        ink && { backgroundColor: C.wine },
        disabled && { opacity: 0.35 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
      {...rest}>
      {busy ? <Spinner color={C.paper} /> : <Text style={s.btnText}>{label}</Text>}
    </Pressable>
  );
}

/** Text with a trailing arrow (`.link`). */
export function TextLink({ label, onPress, color = C.wine, arrow }: { label: string; onPress: () => void; color?: string; arrow?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={10} style={({ pressed }) => [s.link, pressed && { opacity: 0.6 }]}>
      <Text style={[s.linkText, { color }]}>{label}</Text>
      {arrow}
    </Pressable>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return <View style={s.center}>{children}</View>;
}

const s = StyleSheet.create({
  btn: {
    height: 56,
    paddingHorizontal: 30,
    borderRadius: 999,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  block: { alignSelf: 'stretch' },
  btnText: { fontFamily: F.uiSemi, fontSize: 16, letterSpacing: em(16, 0.005), color: C.paper },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { fontFamily: F.uiSemi, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
});
