import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import type { FeedCard } from '../state/buildView';
import { confirmAction } from '../state/confirm';
import { alpha, layout, palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Backdrop } from '../components/Backdrop';
import { Card } from '../components/Card';
import { CheerControl } from '../components/CheerControl';
import { CommentThread, Composer, QuickReplies } from '../components/Comments';
import { Icon } from '../components/Icon';
import { NoticeToast } from '../components/NoticeToast';
import { SessionFacts, SessionHeader, SessionPhoto } from '../components/SessionCard';
import { StatusNote } from '../components/StatusNote';
import { TextAction } from '../components/TextAction';

/**
 * One session (spec: SessionDetail replaces WorkoutDetail): everything on it,
 * cheers, the comment thread with quick replies and a 200 character field, and
 * what you can do with it: Edit and Delete for the logger (Delete asks first),
 * Remove me for anyone else in it. A session that's gone (deleted, or you were
 * removed from it) says so instead of showing a blank.
 */
export function SessionDetailScreen({ navigation, route }: RootStackScreenProps<'SessionDetail'>) {
  const view = useView();
  const { cheer, uncheer, comment, deleteComment, removeMe, deleteSession } = useApp();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  // While this screen slides away after Delete or Remove me, it keeps showing the
  // session it had, instead of flashing the "isn't here anymore" state.
  const [leaving, setLeaving] = useState<FeedCard | null>(null);
  const card = view.sessions[route.params.sessionId] ?? leaving;
  // With the keyboard up, the dock sits right on it (no home indicator gap).
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const reply = route.params.reply;

  useEffect(() => {
    if (!reply) return;
    // After the push has landed, so the keyboard doesn't fight the slide.
    const t = setTimeout(() => input.current?.focus(), 450);
    return () => clearTimeout(t);
  }, [reply]);

  const back = (
    <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={space.s8}>
      <Icon name="back" size={24} color={palette.char} />
    </Pressable>
  );

  if (!card) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Backdrop />
        {back}
        <View style={styles.gone}>
          <Icon name="stone" size={32} color={palette.pebble} />
          <Text style={[type.heading, styles.gap12]} accessibilityRole="header">
            This session isn’t here anymore
          </Text>
          <Text style={[type.bodySmall, styles.gap8]}>Whoever logged it may have deleted it, or you were taken off it. Your week is up to date.</Text>
          <TextAction label="Back" onPress={() => navigation.goBack()} tone="coal" size="bodySmall" style={styles.left} />
        </View>
      </View>
    );
  }

  const onDelete = async () => {
    if (await confirmAction('Delete this session?', 'It goes for everyone in it, with its cheers and comments.', 'Delete')) {
      setLeaving(card);
      navigation.goBack();
      deleteSession(card.id);
    }
  };
  const onRemoveMe = async () => {
    if (await confirmAction('Take yourself off this session?', 'It comes off your week. Everyone else keeps it.', 'Remove me')) {
      setLeaving(card);
      navigation.goBack();
      removeMe(card.id);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <View style={styles.bar}>
        {back}
        {card.canEdit ? (
          <TextAction label="Edit" onPress={() => navigation.navigate('EditSession', { sessionId: card.id })} size="bodySmall" style={styles.edit} />
        ) : null}
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space.s24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card>
            <SessionHeader card={card} large />
            <SessionFacts card={card} />
            {card.photoUri ? <SessionPhoto uri={card.photoUri} style={styles.photo} /> : null}
            {card.note ? <Text style={[type.body, styles.gap12]}>{card.note}</Text> : null}
            {card.pending ? (
              <View style={styles.gap12}>
                <StatusNote icon="timer" text="Waiting to send. It goes as soon as you’re back online." />
              </View>
            ) : null}
            <View style={styles.cheers}>
              {card.canCheer ? (
                <CheerControl label={card.cheerLabel} cheered={card.cheers.byMe} onCheer={() => void cheer(card.id)} onUncheer={() => void uncheer(card.id)} />
              ) : null}
              <Text style={type.label}>{card.cheers.line ?? (card.canCheer ? '' : 'No cheers yet')}</Text>
            </View>
          </Card>

          <Text style={[type.caption, styles.label]} accessibilityRole="header">
            Comments
          </Text>
          <Card>
            <CommentThread
              comments={card.comments}
              onDelete={async (c) => {
                if (await confirmAction('Delete this comment?', `“${c.body}”`, 'Delete')) deleteComment(c.id);
              }}
            />
          </Card>
          {!card.pending ? (
            <View style={styles.composeArea}>
              <QuickReplies replies={card.quickReplies} onPick={(r) => void comment(card.id, r)} />
            </View>
          ) : null}

          {card.canDelete || card.canRemoveMe ? (
            <View style={styles.actions}>
              {card.canDelete ? <TextAction label="Delete session" onPress={onDelete} tone="coal" size="bodySmall" /> : null}
              {card.canRemoveMe ? <TextAction label="Remove me from this session" onPress={onRemoveMe} tone="coal" size="bodySmall" /> : null}
            </View>
          ) : null}
        </ScrollView>
        {/* Docked under the thread, so the keyboard lifts it instead of covering it. */}
        {!card.pending ? (
          <View style={[styles.dock, { paddingBottom: keyboard ? space.s8 : Math.max(insets.bottom, space.s12) }]}>
            <Composer ref={input} onSend={(body) => void comment(card.id, body)} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
      <NoticeToast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s8, minHeight: layout.touch },
  back: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  edit: { paddingHorizontal: space.s12 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.s8 },
  photo: { marginTop: space.s16 },
  gap8: { marginTop: space.s8 },
  gap12: { marginTop: space.s12 },
  cheers: { flexDirection: 'row', alignItems: 'center', gap: space.s16, marginTop: space.s12, flexWrap: 'wrap' },
  label: { marginTop: space.s24, marginBottom: space.s8, paddingHorizontal: space.s8 },
  composeArea: { marginTop: space.s16 },
  dock: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.s8,
    backgroundColor: palette.birch,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: alpha.hairline,
  },
  actions: { marginTop: space.s32, gap: space.s8, alignItems: 'center' },
  gone: { paddingHorizontal: layout.inset, paddingTop: space.s40 },
  left: { alignSelf: 'flex-start', marginTop: space.s16 },
});
