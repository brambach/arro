import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { AvatarStack } from '../components/AvatarStack';
import { CheerButton } from '../components/CheerButton';
import { ChevronLeft } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PhotoSlot } from '../components/PhotoSlot';
import { RouteMap } from '../components/RouteMap';
import { TextButton } from '../components/TextButton';
import { useApp, useView } from '../state/AppState';
import { confirmAction, showError } from '../state/confirm';
import { PHOTOS_ON, pickPhoto } from '../state/photos';
import { WorkoutDetail } from '../data/types';
import { joinNames, workoutSourceLabels, workoutTypeLabels } from '../data/workouts';
import { RootStackScreenProps } from '../navigation/types';
import { Backdrop } from '../components/Backdrop';
import { Chip } from '../components/Chip';
import { WorkoutType } from '../data/types';

export function WorkoutDetailScreen({ navigation, route }: RootStackScreenProps<'WorkoutDetail'>) {
  const insets = useSafeAreaInsets();
  const view = useView();
  const { online, setWorkoutPhoto, cheer, comment, deleteComment, removeWorkout, changeWorkoutType } = useApp();
  const [editingType, setEditingType] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const workout: WorkoutDetail | undefined = view.workouts[route.params.workoutId];

  if (!workout) return null;

  const label = workoutTypeLabels[workout.type];
  const mine = workout.memberId === view.me.id;
  const owner = view.members[workout.memberId];
  // You first, as "You".
  const cheerers = [...workout.cheeredBy]
    .sort((a, b) => Number(b === view.me.id) - Number(a === view.me.id))
    .map((id) => view.members[id])
    .filter(Boolean);
  const cheererNames = cheerers.map((c) => (c.id === view.me.id ? 'You' : c.name));
  const cheeredByMe = workout.cheeredBy.includes(view.me.id);
  const stats = [
    workout.distance ? { value: workout.distance, label: 'Distance' } : null,
    workout.duration ? { value: workout.duration, label: 'Time' } : null,
    workout.place && !workout.route ? { value: workout.place, label: 'Where' } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const send = async (body: string) => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await comment(workout.id, text);
      setDraft('');
    } catch {
      showError('Couldn’t send that', 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    if (!(await confirmAction('Delete your comment?', 'Your family won’t see it any more.', 'Delete'))) return;
    deleteComment(id).catch(() => showError('Couldn’t delete it', 'Check your connection and try again.'));
  };

  const pickType = async (next: WorkoutType) => {
    setEditingType(false);
    if (next === workout.type) return;
    changeWorkoutType(workout.id, next).catch(() => showError('Couldn’t change it', 'Check your connection and try again.'));
  };

  const remove = async () => {
    const fromHealth = workout.source === 'health';
    const ok = await confirmAction(
      'Remove this workout?',
      fromHealth
        ? 'It comes off Arro for your family, with its cheers and comments. Apple Health keeps it.'
        : 'It comes off Arro for your family, with its cheers and comments.',
      'Remove',
    );
    if (!ok) return;
    try {
      await removeWorkout(workout.id);
      navigation.goBack();
    } catch {
      showError('Couldn’t remove it', 'Check your connection and try again.');
    }
  };

  const changePhoto = async (remove: boolean) => {
    const uri = remove ? null : await pickPhoto('landscape');
    if (!remove && !uri) return;
    setSavingPhoto(true);
    try {
      await setWorkoutPhoto(workout.id, uri);
    } catch {
      showError('Couldn’t save the photo', 'Check your connection and try again.');
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Backdrop />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {workout.route ? (
          <Pressable
            onPress={() => navigation.navigate('Map', { memberId: workout.memberId })}
            accessibilityRole="button"
            accessibilityLabel={mine ? 'Open your map' : `Open ${owner?.name ?? 'their'}’s map`}
          >
            <RouteMap routes={[workout.route]} style={styles.map} />
          </Pressable>
        ) : null}

        {workout.photoUri ? (
          <PhotoSlot uri={workout.photoUri} style={styles.photo} />
        ) : null}

        <View style={styles.headline}>
          <Text style={styles.when}>
            {workout.when} · {workout.sourceApp ? `From ${workout.sourceApp}` : workoutSourceLabels[workout.source]}
          </Text>
          <Text style={styles.kind}>{label}</Text>
        </View>

        {stats.length > 0 ? (
          <FadeInView delay={60} style={styles.statsWrap}>
            <View style={styles.stats}>
              {stats.map((s, i) => (
                <Stat key={s.label} value={s.value} label={s.label} first={i === 0} />
              ))}
            </View>
          </FadeInView>
        ) : null}

        <FadeInView delay={180} style={styles.noteWrap}>
          {workout.note ? <Text style={styles.note}>{workout.note}</Text> : null}
          {!mine && online ? (
            <CheerButton
              key={cheeredByMe ? 'cheered' : 'not-yet'}
              initiallyCheered={cheeredByMe}
              label={`Cheer ${owner?.name ?? 'them'} on`}
              onCheer={() => cheer(workout.id)}
              style={[styles.cheerButton, !workout.note && { marginTop: 0 }]}
            />
          ) : null}
          {cheerers.length > 0 ? (
            <View style={[styles.cheered, !workout.note && mine && { marginTop: 0 }]}>
              <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
              <Text style={styles.cheeredText}>{joinNames(cheererNames)} cheered</Text>
            </View>
          ) : null}

          {workout.comments.length > 0 ? (
            <View style={styles.comments}>
              {workout.comments.map((c) => {
                const who = view.members[c.memberId];
                const own = c.memberId === view.me.id;
                return (
                  <Pressable
                    key={c.id}
                    style={styles.comment}
                    onLongPress={own ? () => removeComment(c.id) : undefined}
                    accessibilityHint={own ? 'Long press to delete' : undefined}
                  >
                    <AvatarRing member={who} name={who?.name} size={26} />
                    <Text style={styles.commentText}>
                      <Text style={styles.commentName}>{own ? 'You' : (who?.name ?? 'Someone')} </Text>
                      {c.body}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {online ? (
            <View style={styles.compose}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.quick}
              >
                {(mine ? OWN_QUICK : workout.route ? [...QUICK, 'Great route'] : QUICK).map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => send(q)}
                    disabled={sending}
                    accessibilityRole="button"
                    accessibilityLabel={`Send “${q}”`}
                    style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.quickText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.inputRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={mine ? 'Say something' : `Say something to ${owner?.name ?? 'them'}`}
                  placeholderTextColor={colors.faint3}
                  maxLength={200}
                  returnKeyType="send"
                  onSubmitEditing={() => send(draft)}
                  style={styles.input}
                />
                {draft.trim() ? (
                  <TextButton label={sending ? 'Sending…' : 'Send'} onPress={() => send(draft)} />
                ) : null}
              </View>
            </View>
          ) : null}
          <View style={styles.links}>
            {workout.route ? (
              <TextButton
                label={mine ? 'See all your routes' : `See all of ${owner?.name ?? 'their'}’s routes`}
                onPress={() => navigation.navigate('Map', { memberId: workout.memberId })}
              />
            ) : null}
            {mine ? (
              editingType ? (
                <View style={styles.types}>
                  {TYPES.map((t) => (
                    <Chip key={t} label={workoutTypeLabels[t]} selected={t === workout.type} onPress={() => pickType(t)} />
                  ))}
                </View>
              ) : (
                <View style={styles.photoActions}>
                  <TextButton label="Change type" onPress={() => setEditingType(true)} />
                </View>
              )
            ) : null}
            {mine && PHOTOS_ON ? (
              <View style={styles.photoActions}>
                {savingPhoto ? <ActivityIndicator color={colors.muted} /> : null}
                {!savingPhoto ? (
                  <TextButton label={workout.photoUri ? 'Change photo' : 'Add a photo'} onPress={() => changePhoto(false)} />
                ) : null}
                {!savingPhoto && workout.photoUri ? (
                  <TextButton label="Remove photo" onPress={() => changePhoto(true)} style={{ color: colors.muted }} />
                ) : null}
              </View>
            ) : null}
            {mine ? <TextButton label="Remove workout" onPress={remove} style={{ color: colors.muted }} /> : null}
          </View>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** One tap sends these, so a cheer with words takes no typing. */
const QUICK = ['Proud of you', 'Nice one!', 'Go you', 'Love this'];
const OWN_QUICK = ['Thanks!', 'Thank you all'];
const TYPES: WorkoutType[] = ['walk', 'run', 'ride', 'swim', 'gym', 'yoga', 'other'];

function Stat({ value, label, first }: { value: string; label: string; first?: boolean }) {
  return (
    <View style={[styles.stat, !first && styles.statBorder]}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: 16 },
  headerTitle: { ...type.name },
  map: {
    marginHorizontal: spacing.gutter,
    marginTop: 6,
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.track,
    ...shadows.card,
  },
  photo: { marginHorizontal: spacing.gutter, marginTop: 10, aspectRatio: 4 / 3, borderRadius: radii.card },
  links: { gap: 14, marginTop: 20, alignItems: 'flex-start' },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  headline: { paddingHorizontal: spacing.gutter, paddingTop: 18 },
  when: { ...type.meta, color: colors.muted },
  kind: { ...type.title, fontSize: 38, lineHeight: 40, marginTop: 2 },
  statsWrap: { paddingHorizontal: spacing.gutter, paddingTop: 16 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  stat: { flex: 1, paddingVertical: 13 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 18 },
  statValue: { fontSize: 17, fontWeight: weights.semibold, color: colors.ink },
  statLabel: { ...type.meta, color: colors.muted, marginTop: 2 },
  noteWrap: { paddingHorizontal: spacing.gutter, paddingTop: 16 },
  note: { ...type.body, color: colors.inkSoft },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 15 },
  cheeredText: { ...type.meta, color: colors.muted },
  cheerButton: { alignSelf: 'flex-start', marginTop: 15 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  comments: { gap: 12, marginTop: 18 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentText: { ...type.body, color: colors.inkSoft, flex: 1, paddingTop: 2 },
  commentName: { fontWeight: weights.semibold, color: colors.ink },
  compose: { marginTop: 18, gap: 10 },
  quick: { gap: 8, paddingRight: 8 },
  quickChip: {
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    ...shadows.card,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  quickText: { fontSize: 14, fontWeight: weights.medium, color: colors.inkSoft },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.sunk,
    borderRadius: radii.button,
    ...shadows.sunk,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    color: colors.ink,
  },
});
