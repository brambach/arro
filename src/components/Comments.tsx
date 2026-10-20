import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, depth, palette, radii, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import type { CommentView } from '../state/buildView';
import { Avatar } from './Avatar';
import { TextAction } from './TextAction';

/** The longest comment, as the server allows. */
export const COMMENT_MAX = 200;

/**
 * A session's comments, oldest first. One still on its way is a little faint.
 * A long press offers Delete on your own comments, and the logger's on any.
 */
export function CommentThread({ comments, onDelete }: { comments: CommentView[]; onDelete: (c: CommentView) => void }) {
  if (!comments.length) return <Text style={type.label}>No comments yet. Say something nice.</Text>;
  return (
    <View style={styles.thread}>
      {comments.map((c) => (
        <Pressable
          key={c.id}
          onLongPress={c.canDelete && !c.pending ? () => onDelete(c) : undefined}
          accessibilityLabel={`${c.mine ? 'You' : c.member.name}: ${c.body}`}
          accessibilityHint={c.canDelete ? 'Long press to delete' : undefined}
          accessibilityActions={c.canDelete ? [{ name: 'delete', label: 'Delete' }] : undefined}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete(c)}
        >
          <Animated.View entering={c.pending ? FadeIn.duration(timing.utility.duration) : undefined} style={[styles.comment, c.pending && styles.pending]}>
            <Avatar name={c.member.name} color={c.member.color} photoUri={typeof c.member.photoUri === 'string' ? c.member.photoUri : null} size={28} />
            <View style={styles.commentText}>
              <Text style={type.labelStrong}>{c.mine ? 'You' : c.member.name}</Text>
              <Text style={[type.bodySmall, styles.body]}>{c.body}</Text>
            </View>
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}

/** One-tap replies: "Nice heat", "Jealous", "Save me a spot". Trays, not pills. */
export function QuickReplies({ replies, onPick }: { replies: string[]; onPick: (reply: string) => void }) {
  return (
    <View style={styles.replies}>
      {replies.map((r) => (
        <Tray key={r} label={r} onPress={() => onPick(r)} />
      ))}
    </View>
  );
}

function Tray({ label, onPress }: { label: string; onPress: () => void }) {
  const dim = useSharedValue(0);
  const wash = useAnimatedStyle(() => ({ opacity: dim.value }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        dim.set(withTiming(1, timing.utility));
      }}
      onPressOut={() => {
        dim.set(withTiming(0, timing.utility));
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reply “${label}”`}
      style={styles.tray}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.trayWash, wash]} />
      <Text style={[type.bodySmallStrong, styles.trayText]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The comment field: a steam well, 200 characters, with Send as plain coal
 * text. The count shows once you're near the end.
 */
export const Composer = forwardRef<TextInput, { onSend: (body: string) => void }>(function Composer({ onSend }, ref) {
  const [text, setText] = useState('');
  const left = COMMENT_MAX - text.length;
  const send = () => {
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText('');
  };
  return (
    <View style={styles.composer}>
      <TextInput
        ref={ref}
        value={text}
        onChangeText={setText}
        maxLength={COMMENT_MAX}
        multiline
        placeholder="Add a comment"
        placeholderTextColor={palette.stone}
        selectionColor={palette.ember}
        cursorColor={palette.ember}
        accessibilityLabel="Comment"
        accessibilityHint={`Up to ${COMMENT_MAX} characters`}
        style={[type.body, styles.input]}
      />
      <View style={styles.composerSide}>
        {left <= 40 ? <Text style={type.label}>{left}</Text> : null}
        <TextAction label="Send" onPress={send} tone="coal" disabled={!text.trim()} size="bodySmall" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  thread: { gap: space.s16 },
  comment: { flexDirection: 'row', gap: space.s12 },
  commentText: { flex: 1 },
  body: { color: palette.char },
  pending: { opacity: 0.6 },
  replies: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  tray: {
    borderRadius: radii.field,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    paddingHorizontal: space.s12,
    paddingVertical: space.s8,
    overflow: 'hidden',
  },
  trayWash: { backgroundColor: alpha.press },
  trayText: { color: palette.smoke },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.s12,
    backgroundColor: palette.steam,
    borderRadius: radii.field,
    boxShadow: depth.card,
    paddingLeft: space.s16,
    paddingRight: space.s12,
    paddingVertical: space.s4,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingTop: space.s12, paddingBottom: space.s8 },
  composerSide: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingBottom: space.s4 },
});
