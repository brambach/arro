import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextButton } from '../components/TextButton';
import { TextField } from '../components/TextField';
import { Check } from '../components/Icons';
import { WorkoutType } from '../data/types';
import { workoutTypeLabels } from '../data/workouts';
import { useApp } from '../state/AppState';
import { WorkoutDateError } from '../state/backend';
import { yesterdayClosedAt } from '../state/dates';
import { PHOTOS_ON, pickPhoto } from '../state/photos';
import { useYesterdayOpen } from '../state/useYesterdayOpen';
import { RootStackScreenProps } from '../navigation/types';

const TYPES = Object.keys(workoutTypeLabels) as WorkoutType[];
const MINUTES = [10, 20, 30, 45, 60];

/**
 * Log a workout for today or yesterday, never older. Only the type is needed;
 * duration and note are optional and never ranked.
 */
export function LogTodayScreen({ navigation, route }: RootStackScreenProps<'LogToday'>) {
  const insets = useSafeAreaInsets();
  const { logWorkout } = useApp();
  const yesterdayOk = useYesterdayOpen();
  const [chosenDay, setDay] = useState<'today' | 'yesterday'>(route.params?.day ?? 'today');
  // If yesterday closes while the screen is open, fall back to today.
  const day = yesterdayOk ? chosenDay : 'today';
  const [workoutType, setWorkoutType] = useState<WorkoutType>('walk');
  const [minutes, setMinutes] = useState<number | undefined>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await logWorkout({ day, type: workoutType, minutes, note, photoUri });
      // A small "done" in the hand as Today takes over with the tick.
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      if (e instanceof WorkoutDateError) {
        setDay('today');
        setError(`Yesterday closed at ${yesterdayClosedAt()}, so Arro couldn’t save it. Today still counts.`);
      } else {
        setError('That didn’t save. Check your connection and try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Cancel">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.topTitle}>Log {day}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <Text style={type.title}>What did you do?</Text>
        <Text style={styles.sub}>Anything counts. A walk is as good as a marathon.</Text>

        <View style={[styles.chips, { marginTop: 18 }]}>
          <Chip label="Today" selected={day === 'today'} onPress={() => setDay('today')} />
          {yesterdayOk && <Chip label="Yesterday" selected={day === 'yesterday'} onPress={() => setDay('yesterday')} />}
        </View>
        {!yesterdayOk && !error && (
          <Text style={styles.hint}>
            Yesterday could be logged until {yesterdayClosedAt()}. Today still counts.
          </Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Chip key={t} label={workoutTypeLabels[t]} selected={workoutType === t} onPress={() => setWorkoutType(t)} />
          ))}
        </View>

        <Text style={styles.label}>How long? (optional)</Text>
        <View style={styles.chips}>
          {MINUTES.map((m) => (
            <Chip
              key={m}
              label={m === 60 ? '60+ min' : `${m} min`}
              selected={minutes === m}
              onPress={() => setMinutes(minutes === m ? undefined : m)}
            />
          ))}
        </View>

        {PHOTOS_ON ? <Text style={styles.label}>Photo (optional)</Text> : null}
        {!PHOTOS_ON ? null : photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <TextButton label="Remove photo" onPress={() => setPhotoUri(null)} style={styles.remove} />
          </View>
        ) : (
          <Pressable
            onPress={async () => setPhotoUri((await pickPhoto('landscape')) ?? null)}
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonText}>Add a photo</Text>
          </Pressable>
        )}

        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={140}
          placeholder="Before work. Already tomorrow over here."
          wrapStyle={{ marginTop: 20 }}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton
          title={day === 'today' ? 'I moved today' : 'I moved yesterday'}
          icon={<Check size={20} color={colors.white} strokeWidth={2.6} />}
          onPress={save}
          disabled={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: spacing.gutter, paddingTop: 10 },
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: spacing.gutter },
  cancel: { fontSize: 16, color: colors.muted, width: 60 },
  topTitle: { ...type.name, textTransform: 'capitalize' },
  body: { paddingHorizontal: spacing.gutter, paddingTop: 14, paddingBottom: 24 },
  sub: { ...type.body, marginTop: 6 },
  label: { ...type.label, color: colors.muted, marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hint: { ...type.meta, color: colors.muted, marginTop: 10 },
  error: { ...type.body, color: colors.ink, marginTop: 10 },
  photo: { aspectRatio: 4 / 3, borderRadius: radii.card, backgroundColor: colors.photoPlaceholder },
  remove: { marginTop: 10 },
  photoButton: {
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: { fontSize: 15, fontWeight: weights.semibold, color: colors.inkSoft },
});
