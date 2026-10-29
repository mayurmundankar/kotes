// Previews the story image (1080×1920, drawn by the server so it matches the
// web exactly), lets the reader pick its colour, then hands it to Android's
// share sheet or saves it to the gallery (the web's components/share-sheet).
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastProvider, useToast } from './toast';
import { Button, Spinner } from './ui';
import { ApiError, backend, reportError } from '@/lib/backend';
import { dropImage, saveImage, SaveRefused, shareImage, storeImage } from '@/lib/share-file';
import { PALETTE, SHARE_TONES, type ShareTone } from '@shared/tones';
import { C, F, GUTTER } from '@/theme';

type Props = { quote: { id: number } | null; tone?: ShareTone; onClose: () => void };

export function ShareSheet({ quote, tone = 'rose', onClose }: Props) {
  return (
    <Modal visible={!!quote} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {/* Its own toasts: the app's sit underneath the modal. */}
      <ToastProvider>{quote && <Sheet key={quote.id} quoteId={quote.id} initialTone={tone} onClose={onClose} />}</ToastProvider>
    </Modal>
  );
}

function Sheet({ quoteId, initialTone, onClose }: { quoteId: number; initialTone: ShareTone; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const toast = useToast();
  const [tone, setTone] = useState<ShareTone>(initialTone);
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  // Slides up from just below, like the web's sheet.
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(withTiming(1, { duration: 300, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, [rise]);
  const up = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: 40 * (1 - rise.value) }] }));

  useEffect(() => {
    let alive = true;
    let uri = '';
    backend
      .getShareImage(quoteId, tone)
      .then((bytes) => storeImage(bytes, `kotes-${quoteId}-${tone}.png`))
      .then((stored) => {
        uri = stored;
        if (alive) setImage(stored);
        else dropImage(stored);
      })
      .catch((e) => {
        if (!alive) return;
        setFailed(true);
        // Limits and expired sessions explain themselves; anything else is worth seeing.
        if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) reportError('share-image', e);
        toast(e instanceof ApiError && e.status !== 0 && e.status < 500 ? e.message : "Couldn't make the image. Try again.");
      });
    return () => {
      alive = false;
      if (uri) dropImage(uri);
    };
  }, [quoteId, tone, attempt, toast]);

  // A new colour or a retry: show the spinner until the new image lands.
  const load = (change: () => void) => {
    setImage(null);
    setFailed(false);
    change();
  };

  async function share() {
    if (!image) return;
    setBusy(true);
    try {
      await shareImage(image);
      onClose();
    } catch (e) {
      reportError('share-sheet', e);
      toast("Couldn't open sharing. Try saving the image instead.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!image) return;
    try {
      await saveImage(image);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast('Image saved');
    } catch (e) {
      if (!(e instanceof SaveRefused)) reportError('share-save', e);
      toast(e instanceof SaveRefused ? e.message : "Couldn't save the image. Try again.");
    }
  }

  const previewH = Math.min(height * 0.52, 460);

  return (
    <View style={s.root}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 20 }, up]}
        accessibilityViewIsModal
        accessibilityLabel="Share quote">
        <View style={s.grip} />

        <View style={[s.preview, { height: previewH, width: (previewH * 9) / 16 }]}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel="Preview of the image to share" />
          ) : failed ? (
            <Pressable onPress={() => load(() => setAttempt((n) => n + 1))} accessibilityRole="button" style={s.retry}>
              <Text style={s.link}>Couldn&apos;t load. Tap to retry.</Text>
            </Pressable>
          ) : (
            <Spinner />
          )}
        </View>

        <View style={s.tones} accessibilityRole="radiogroup" accessibilityLabel="Colour">
          {SHARE_TONES.map((t) => {
            const on = tone === t;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  if (on) return;
                  Haptics.selectionAsync().catch(() => {});
                  load(() => setTone(t));
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t}
                hitSlop={6}
                style={[s.swatch, { backgroundColor: PALETTE[t].bg }, on && s.swatchOn]}
              />
            );
          })}
        </View>

        <View style={s.actions}>
          <Button block label="Share to stories & chats" busy={busy} disabled={!image || busy} onPress={share} />
          <View style={s.row}>
            <Pressable onPress={save} disabled={!image} accessibilityRole="button" style={!image && { opacity: 0.4 }}>
              <Text style={s.link}>Save image</Text>
            </Pressable>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={s.link}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,7,17,0.55)' },
  sheet: {
    backgroundColor: C.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: GUTTER,
    alignItems: 'center',
    gap: 18,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.ink12 },
  preview: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.blush,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 24px 50px -24px rgba(194,31,72,0.45)',
  },
  retry: { padding: 16 },
  tones: { flexDirection: 'row', gap: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, boxShadow: `inset 0 0 0 1px ${C.ink12}` },
  swatchOn: { transform: [{ scale: 1.12 }], boxShadow: `0 0 0 2px ${C.paper}, 0 0 0 3.5px ${C.rose}` },
  actions: { alignSelf: 'stretch', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  link: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink60, paddingVertical: 12, paddingHorizontal: 4 },
});
