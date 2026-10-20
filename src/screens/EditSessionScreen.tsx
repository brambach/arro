import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { pickPhoto } from '../state/photos';
import { SaunaType } from '../data/types';
import { LIMITS, SAUNA_TYPES, saunaTypeLabels } from '../data/saunas';
import { depth, layout, palette, radii, space } from '../theme/tokens';
import { haptics } from '../theme/haptics';
import { maxFontScale, type } from '../theme/typography';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { FixedDigits } from '../components/FixedDigits';
import { Icon, IconName } from '../components/Icon';
import { SessionPhoto } from '../components/SessionCard';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';
import { Toggle } from '../components/Toggle';

/**
 * The logger changes a session for everyone in it: minutes, type, cold plunge,
 * place, note and photo. Not optimistic: Save waits for the server, and its
 * refusal shows under the button in coal. The date and who was there stay as
 * logged (delete and log again to change those).
 */
const TYPE_ICONS: Record<SaunaType, IconName> = {
  traditional: 'traditional',
  wood_fired: 'woodFired',
  infrared: 'infrared',
  steam: 'steam',
  smoke: 'smoke',
  banya: 'banya',
  other: 'other',
};

export function EditSessionScreen({ navigation, route }: RootStackScreenProps<'EditSession'>) {
  const view = useView();
  const { editSession, setSessionPhoto } = useApp();
  const insets = useSafeAreaInsets();
  const card = view.sessions[route.params.sessionId];
  const anchor = card?.rows[0];
  const [minutes, setMinutes] = useState(anchor?.durationMinutes ?? 20);
  const [saunaType, setSaunaType] = useState<SaunaType>(anchor?.saunaType ?? 'traditional');
  const [plunge, setPlunge] = useState(anchor?.coldPlunge ?? false);
  const [place, setPlace] = useState(anchor?.place ?? '');
  const [note, setNote] = useState(anchor?.note ?? '');
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!card || !anchor) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + space.s24 }]}>
        <Text style={type.heading}>This session isn’t here anymore</Text>
        <TextAction label="Close" onPress={() => navigation.goBack()} tone="coal" size="bodySmall" style={styles.left} />
      </View>
    );
  }

  const shownPhoto = photo === undefined ? card.photoUri : photo;
  const step = (d: number) => setMinutes((m) => Math.max(LIMITS.minutes.min, Math.min(LIMITS.minutes.max, m + d)));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await editSession(card.id, {
        durationMinutes: minutes,
        saunaType,
        coldPlunge: plunge,
        coldMinutes: plunge ? anchor.coldMinutes : null,
        place: place.trim() || null,
        note: note.trim() || null,
      });
      if (photo !== undefined) await setSessionPhoto(card.id, photo);
      navigation.goBack();
    } catch (e) {
      haptics.error();
      setError(e instanceof Error && e.message ? `Couldn’t save that: ${e.message}` : 'Couldn’t save that. Try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingTop: space.s24, paddingBottom: insets.bottom + space.s32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Text style={type.title} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
            Edit session
          </Text>
          <TextAction label="Cancel" onPress={() => navigation.goBack()} size="bodySmall" />
        </View>
        <Text style={[type.label, styles.gap4]}>{card.when}. Changes show for everyone in it.</Text>

        <Text style={[type.caption, styles.label]}>Minutes</Text>
        <Card style={styles.minutes}>
          <Stepper icon="minus" label="Fewer minutes" onPress={() => step(-1)} />
          <FixedDigits value={String(minutes)} variant="title" accessibilityLabel={`${minutes} minutes`} />
          <Stepper icon="plus" label="More minutes" onPress={() => step(1)} />
        </Card>

        <Text style={[type.caption, styles.label]}>Type</Text>
        <View style={styles.types}>
          {SAUNA_TYPES.map((t) => {
            const on = t === saunaType;
            return (
              <Pressable
                key={t}
                onPress={() => setSaunaType(t)}
                style={[styles.tile, on && styles.tileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={saunaTypeLabels[t]}
              >
                <Icon name={TYPE_ICONS[t]} size={22} color={on ? palette.steam : palette.smoke} />
                <Text style={[type.bodySmallStrong, on ? styles.tileTextOn : styles.tileText]} numberOfLines={1}>
                  {saunaTypeLabels[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.plunge}>
          <Icon name="snowflake" size={22} color={palette.lake} />
          <Text style={[type.bodyStrong, styles.flex]}>Cold plunge</Text>
          <Toggle value={plunge} onValueChange={setPlunge} accessibilityLabel="Cold plunge" />
        </Card>

        <Field label="Place" value={place} onChangeText={setPlace} maxLength={LIMITS.place} placeholder="Home" wrapStyle={styles.field} />
        <Field label="Note" value={note} onChangeText={setNote} maxLength={LIMITS.note} multiline wrapStyle={styles.field} />

        <Text style={[type.caption, styles.label]}>Photo</Text>
        {shownPhoto ? <SessionPhoto uri={shownPhoto} /> : null}
        <View style={styles.photoActions}>
          <TextAction
            label={shownPhoto ? 'Change photo' : 'Add a photo'}
            onPress={async () => {
              const uri = await pickPhoto('landscape');
              if (uri) setPhoto(uri);
            }}
            size="bodySmall"
          />
          {shownPhoto ? <TextAction label="Remove photo" onPress={() => setPhoto(null)} tone="coal" size="bodySmall" /> : null}
        </View>

        <SolidButton title={saving ? 'Saving' : 'Save changes'} onPress={save} disabled={saving} style={styles.save} />
        {error ? (
          <Text style={[type.label, styles.error]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepper} accessibilityRole="button" accessibilityLabel={label} hitSlop={space.s8}>
      <Icon name={icon} size={22} color={palette.char} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  pad: { paddingHorizontal: layout.inset },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gap4: { marginTop: space.s4 },
  label: { marginTop: space.s24, marginBottom: space.s8 },
  minutes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    width: layout.touch,
    height: layout.touch,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  tile: {
    width: '31%',
    flexGrow: 1,
    height: 72,
    borderRadius: radii.tile,
    backgroundColor: palette.steam,
    boxShadow: depth.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s4,
    paddingHorizontal: space.s4,
  },
  tileOn: { backgroundColor: palette.ember, boxShadow: depth.button },
  tileText: { color: palette.smoke },
  tileTextOn: { color: palette.steam },
  plunge: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s16 },
  field: { marginTop: space.s16 },
  photoActions: { flexDirection: 'row', gap: space.s24, marginTop: space.s8 },
  save: { marginTop: space.s32 },
  error: { color: palette.coal, marginTop: space.s12 },
  left: { alignSelf: 'flex-start', marginTop: space.s16 },
});
