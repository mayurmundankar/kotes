// "Kept": the reader's shelf of kept and liked quotes (the web's /library).
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Bookmark, Heart, Share } from '@/components/icons';
import { TopBar, usePagePadding } from '@/components/page';
import { ShareSheet } from '@/components/share-sheet';
import { useToast } from '@/components/toast';
import { Button, Rise, Spinner } from '@/components/ui';
import { backend, type Kind, type Quote } from '@/lib/backend';
import { themeLabel } from '@shared/themes';
import { C, F, T, em } from '@/theme';

type Lists = Record<Kind, Quote[] | null>;

export default function Library() {
  const padding = usePagePadding();
  const toast = useToast();
  const [tab, setTab] = useState<Kind>('save');
  const [lists, setLists] = useState<Lists>({ save: null, like: null });
  const [sharing, setSharing] = useState<Quote | null>(null);

  // Fresh every time the tab opens: the feed may have kept or liked since.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([backend.getLibrary('save'), backend.getLibrary('like')])
        .then(([save, like]) => alive && setLists({ save, like }))
        .catch(() => alive && toast("Couldn't load your shelf. Try again."));
      return () => {
        alive = false;
      };
    }, [toast]),
  );

  // Toggling keeps the row in place so a stray tap can be undone.
  async function toggle(q: Quote, kind: Kind) {
    const key = kind === 'like' ? 'liked' : 'saved';
    const on = !q[key];
    const patch = (v: boolean) =>
      setLists((l) => ({
        save: l.save?.map((x) => (x.id === q.id ? { ...x, [key]: v } : x)) ?? null,
        like: l.like?.map((x) => (x.id === q.id ? { ...x, [key]: v } : x)) ?? null,
      }));
    Haptics.selectionAsync().catch(() => {});
    patch(on);
    try {
      await backend.react(q.id, kind, on);
    } catch {
      patch(!on);
      toast("That didn't save. Try again.");
    }
  }

  const list = lists[tab];
  const count = (k: Kind) => lists[k]?.length ?? '–';

  const header = (
    <View>
      <TopBar eyebrow="Your shelf" />
      <Rise>
        <Text style={[T.title(46), s.title]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
          Words that <Text style={T.em}>stayed.</Text>
        </Text>
      </Rise>
      <View style={s.tabs} accessibilityRole="tablist">
        {(['save', 'like'] as Kind[]).map((k) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={s.tab}>
              <Text style={[s.tabText, on && { color: C.wine }]}>
                {k === 'save' ? 'Kept' : 'Liked'} <Text style={s.sup}>{count(k)}</Text>
              </Text>
              {on && <View style={s.tabLine} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      <FlatList
        style={{ backgroundColor: C.paper }}
        contentContainerStyle={[{ flexGrow: 1 }, padding]}
        data={list ?? []}
        keyExtractor={(q) => String(q.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list === null ? (
            <View style={s.loading}>
              <Spinner />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {tab === 'save'
                  ? 'Nothing kept yet. Tap the bookmark on any line that stays with you.'
                  : 'No likes yet. Double-tap a quote you love.'}
              </Text>
              <Button label="Go reading" onPress={() => router.navigate('/feed')} />
            </View>
          )
        }
        renderItem={({ item: q, index }) => (
          <Rise delay={(Math.min(index, 6) * 25) / 40} style={s.item}>
            <Text style={s.quote}>
              <Text style={s.quoteMark}>“</Text>
              {q.text}
            </Text>
            <View style={s.row}>
              <Text style={s.tags}>{q.tags.map(themeLabel).join(' · ')}</Text>
              <View style={s.acts}>
                <Act on={q.liked} label={q.liked ? 'Unlike' : 'Like'} onPress={() => toggle(q, 'like')}>
                  <Heart size={21} filled={q.liked} color={q.liked ? C.rose : C.ink60} />
                </Act>
                <Act on={q.saved} label={q.saved ? 'Remove from kept' : 'Keep'} onPress={() => toggle(q, 'save')}>
                  <Bookmark size={21} filled={q.saved} color={q.saved ? C.rose : C.ink60} />
                </Act>
                <Act label="Share" onPress={() => setSharing(q)}>
                  <Share size={21} color={C.ink60} />
                </Act>
              </View>
            </View>
          </Rise>
        )}
      />
      <ShareSheet quote={sharing} onClose={() => setSharing(null)} />
    </>
  );
}

function Act({
  on,
  label,
  onPress,
  children,
}: {
  on?: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on === undefined ? undefined : { selected: on }}
      style={({ pressed }) => [s.act, pressed && { transform: [{ scale: 0.85 }] }]}>
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  title: { marginTop: 40, marginBottom: 28 },
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1, borderBottomColor: C.ink12 },
  tab: { paddingTop: 12, paddingBottom: 14 },
  tabText: { fontFamily: F.displayItalic, fontSize: 21, color: C.ink40 },
  sup: { fontFamily: F.uiBold, fontSize: 10, fontStyle: 'normal' },
  tabLine: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, backgroundColor: C.rose },
  loading: { alignItems: 'center', paddingVertical: 80 },
  empty: { alignItems: 'flex-start', gap: 24, paddingVertical: 48 },
  emptyText: { fontFamily: F.readItalic, fontSize: 23, lineHeight: 23 * 1.35, color: C.ink60 },
  item: { paddingTop: 28, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: C.ink12 },
  quote: { fontFamily: F.readMedium, fontSize: 25, lineHeight: 30, color: C.wine },
  quoteMark: { fontFamily: F.display, color: C.rose },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  tags: {
    flex: 1,
    fontFamily: F.uiSemi,
    fontSize: 11,
    letterSpacing: em(11, 0.18),
    textTransform: 'uppercase',
    color: C.ink40,
    paddingBottom: 12,
  },
  acts: { flexDirection: 'row', marginRight: -10 },
  act: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
