// One short message at a time, above the nav (the web's useToast).
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, NAV_H } from '@/theme';

const ToastContext = createContext<(text: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();

  const toast = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMsg({ id: Date.now(), text });
    timer.current = setTimeout(() => setMsg(null), 1800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <View pointerEvents="none" style={[s.wrap, { bottom: NAV_H + insets.bottom + 18 }]}>
        {msg && (
          <Animated.View
            key={msg.id}
            entering={Platform.OS === 'web' ? undefined : FadeInDown.duration(300)}
            exiting={Platform.OS === 'web' ? undefined : FadeOut.duration(300)}
            style={s.toast}>
            <Text style={s.text} accessibilityLiveRegion="polite" accessibilityRole="alert">
              {msg.text}
            </Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 90 },
  toast: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: C.wine },
  text: { fontFamily: F.uiMedium, fontSize: 13.5, color: C.paper },
});
