// Sign-in, step one (email) and two (the emailed code). The web's /login,
// with Play Integrity standing in for Turnstile.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputInstance,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Back } from '@/components/icons';
import { Button, Eyebrow, Rise, Spinner, Wordmark } from '@/components/ui';
import { ApiError, backend, OTP_LENGTH, reportError } from '@/lib/backend';
import { APP_SIGNIN_OFF } from '@shared/integrity';
import { C, F, GUTTER, SITE, T } from '@/theme';

const RESEND_AFTER = 60;
// Matches the server: plain characters only.
const EMAIL = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export default function Login() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const codeRef = useRef<TextInputInstance>(null);

  // Fetch sign-in settings and warm up Play Integrity while they type.
  useEffect(() => {
    backend.prepareSignIn().catch(() => {});
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Android back on the code step goes back to the email, not off the screen.
  useEffect(() => {
    if (step !== 'code') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep('email');
      setError('');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  async function send() {
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setError("That email doesn't look quite right.");
    setBusy(true);
    setError('');
    try {
      await backend.sendCode(clean);
      setEmail(clean);
      setCode('');
      setStep('code');
      setWait(RESEND_AFTER);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter);
      // Expected refusals (limits, bad email, app sign-in not set up) aren't
      // bugs; anything else is worth seeing.
      const expected = err instanceof ApiError && (err.status < 500 || err.message === APP_SIGNIN_OFF);
      if (!expected) reportError('signup-code', err);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError('');
    try {
      await backend.verifyCode(email, value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // The root layout's guards take it from here.
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError((err as Error).message);
      setCode('');
      setBusy(false);
      setTimeout(() => codeRef.current?.focus(), 50);
    }
  }

  function onCode(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH && !busy) verify(digits);
  }

  const back = () => {
    if (step === 'code') {
      setStep('email');
      setError('');
    } else router.back();
  };

  return (
    // Android draws edge to edge, so the window no longer shrinks for the keyboard: pad instead.
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled">
        <View style={s.topbar}>
          <Pressable
            onPress={back}
            style={s.back}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={step === 'email' ? 'Back' : 'Change email'}>
            <Back />
          </Pressable>
          <Wordmark />
          <View style={{ width: 44 }} />
        </View>

        {step === 'email' ? (
          <View key="email" style={[s.body, { paddingTop: height * 0.09 }]}>
            <Rise>
              <Eyebrow>Step one of two</Eyebrow>
            </Rise>
            <Rise delay={1}>
              <Text style={T.title(46)} maxFontSizeMultiplier={1.3} accessibilityRole="header">
                Your <Text style={T.em}>email,</Text> please.
              </Text>
            </Rise>
            <Rise delay={2}>
              <Text style={s.sub}>
                No password to remember. We&apos;ll send a {OTP_LENGTH}-digit code, whether you&apos;re new or returning.
              </Text>
            </Rise>
            <Rise delay={3}>
              <EmailField value={email} onChange={setEmail} onSubmit={send} />
            </Rise>
            <Text style={T.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
            <View style={s.foot}>
              <Button label="Continue with email" block busy={busy} disabled={busy || !email} onPress={send} />
              <Text style={s.promise}>
                We don&apos;t have bandwidth to send you promotional emails<Text style={{ color: C.rose }}>…</Text>
              </Text>
              <Text style={[T.fine, s.underline]} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} accessibilityRole="link">
                How we handle your data
              </Text>
            </View>
          </View>
        ) : (
          <View key="code" style={[s.body, { paddingTop: height * 0.09 }]}>
            <Rise>
              <Eyebrow>Step two of two</Eyebrow>
            </Rise>
            <Rise delay={1}>
              <Text style={T.title(46)} maxFontSizeMultiplier={1.3} accessibilityRole="header">
                Check your <Text style={T.em}>inbox.</Text>
              </Text>
            </Rise>
            <Rise delay={2}>
              <Text style={s.sub}>
                We sent a code to <Text style={s.strong}>{email}</Text>. It expires soon.
              </Text>
            </Rise>
            <Rise delay={3}>
              <CodeField inputRef={codeRef} value={code} onChange={onCode} busy={busy} />
            </Rise>
            <Text style={T.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
            <View style={s.foot}>
              {busy ? (
                <View style={s.verifying}>
                  <Spinner />
                  <Text style={s.verifyingText}>Opening your feed…</Text>
                </View>
              ) : (
                <Pressable onPress={send} disabled={wait > 0} style={s.resend} accessibilityRole="button">
                  <Text style={[s.resendText, wait > 0 && { color: C.ink40 }]}>
                    {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EmailField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      // The web's placeholder is italic; RN styles it with the field's own font.
      style={[s.field, !value && { fontFamily: F.readItalic }, focused && { borderBottomColor: C.rose }]}
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="you@somewhere.com"
      placeholderTextColor={C.ink40}
      keyboardType="email-address"
      autoComplete="email"
      textContentType="emailAddress"
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      returnKeyType="send"
      selectionColor={C.rose}
      cursorColor={C.rose}
      autoFocus
      accessibilityLabel="Email"
    />
  );
}

/** Six cells over one invisible input, so paste and autofill still work. */
function CodeField({
  inputRef,
  value,
  onChange,
  busy,
}: {
  inputRef: React.RefObject<TextInputInstance | null>;
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
}) {
  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={s.otp} accessible={false}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <View
          key={i}
          style={[s.cell, i < value.length && { borderBottomColor: C.wine }, i === value.length && !busy && { borderBottomColor: C.rose }]}>
          {value[i] ? <Text style={s.cellText}>{value[i]}</Text> : i === value.length && !busy ? <Caret /> : null}
        </View>
      ))}
      <TextInput
        ref={inputRef}
        style={s.otpInput}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH}
        editable={!busy}
        caretHidden
        accessibilityLabel={`${OTP_LENGTH}-digit code`}
      />
    </Pressable>
  );
}

function Caret() {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    on.value = withRepeat(withSequence(withTiming(1, { duration: 550 }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 550 }), withTiming(1, { duration: 0 })), -1);
  }, [on, reduceMotion]);
  const blink = useAnimatedStyle(() => ({ opacity: on.value }));
  return <Animated.View style={[s.caret, blink]} />;
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: GUTTER, backgroundColor: C.paper },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  body: { flex: 1, gap: 18 },
  sub: { fontFamily: F.read, fontSize: 20, lineHeight: 28, color: C.ink60, marginBottom: 18 },
  strong: { fontFamily: F.readMedium, color: C.wine },
  field: {
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink12,
    paddingVertical: 14,
    paddingHorizontal: 0,
    fontFamily: F.read,
    fontSize: 28,
    color: C.wine,
    outlineWidth: 0,
  },
  foot: { marginTop: 'auto', gap: 16, alignItems: 'center', paddingTop: 24 },
  promise: { fontFamily: F.readItalic, fontSize: 16, color: C.ink60, textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  otp: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink12,
  },
  cellText: { fontFamily: F.display, fontSize: 34, color: C.wine },
  caret: { width: 1.5, height: 34, backgroundColor: C.rose },
  otpInput: { ...StyleSheet.absoluteFill, opacity: 0, color: 'transparent' },
  resend: { padding: 12 },
  resendText: { fontFamily: F.uiSemi, fontSize: 14, color: C.wine },
  verifying: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  verifyingText: { fontFamily: F.ui, fontSize: 14, color: C.ink60 },
});
