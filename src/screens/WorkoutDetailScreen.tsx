import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PhotoSlot } from '../components/PhotoSlot';
import { RouteMap } from '../components/RouteMap';
import { TextButton } from '../components/TextButton';
import { useApp, useView } from '../state/AppState';
import { showError } from '../state/confirm';
import { PHOTOS_ON, pickPhoto } from '../state/photos';
import { WorkoutDetail } from '../data/types';
import { joinNames, workoutSourceLabels, workoutTypeLabels } from '../data/workouts';
import { RootStackScreenProps } from '../navigation/types';

export function WorkoutDetailScreen({ navigation, route }: RootStackScreenProps<'WorkoutDetail'>) {
  const insets = useSafeAreaInsets();
  const view = useView();
  const { setWorkoutPhoto } = useApp();
  const [savingPhoto, setSavingPhoto] = useState(false);
  const workout: WorkoutDetail | undefined = view.workouts[route.params.workoutId];

  if (!workout) return null;

  const label = workoutTypeLabels[workout.type];
  const mine = workout.memberId === view.me.id;
  const owner = view.members[workout.memberId];
  const cheerers = workout.cheeredBy.map((id) => view.members[id]).filter(Boolean);
  const stats = [
    workout.distance ? { value: workout.distance, label: 'Distance' } : null,
    workout.duration ? { value: workout.duration, label: 'Time' } : null,
    workout.place && !workout.route ? { value: workout.place, label: 'Where' } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>{label}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
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
            {workout.when} · {workoutSourceLabels[workout.source]}
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
          {cheerers.length > 0 ? (
            <View style={[styles.cheered, !workout.note && { marginTop: 0 }]}>
              <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
              <Text style={styles.cheeredText}>{joinNames(cheerers.map((c) => c.name))} cheered</Text>
            </View>
          ) : null}
          <View style={styles.links}>
            {workout.route ? (
              <TextButton
                label={mine ? 'See all your routes' : `See all of ${owner?.name ?? 'their'}’s routes`}
                onPress={() => navigation.navigate('Map', { memberId: workout.memberId })}
              />
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
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

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
  kind: { ...type.title, fontSize: 32, lineHeight: 38, marginTop: 2 },
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
});
