import React, { useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { TIMER_FACES, TimerFace } from '../state/look';
import { alpha, palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceList } from '../components/ChoiceList';
import { FixedDigits } from '../components/FixedDigits';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { TimerDial, faceNumerals, faceRoom } from '../components/TimerDial';
import { ARC_PAD } from '../components/TimerArc';
import { devDriverOn } from '../dev/DevDriver';

export const TIMER_FACE_COPY = {
  title: 'Timer face',
  lead: 'How the timer looks for you. Everyone picks their own.',
  faces: 'Faces',
  plusFace: 'Included with Plus',
  tryOn: 'Tap to try it on',
  tryingOn: 'Trying it on. Nothing is saved.',
  keep: 'Keep this face with Plus',
  back: (name: string) => `Back to ${name}`,
  saved: (name: string) => `Saved. Your timer is ${name} now.`,
};

/** 12:40 into a 15 minute session, as in the mockups. */
const SAMPLE = { heatMs: 760_000, target: 15 };

/**
 * Me > Timer face (Plus): Löyly is free; Coal and Brass come with Plus. Each
 * person picks their own, kept on this phone. Without Plus, tapping Coal or
 * Brass tries it on in the room above (nothing saved) with "Keep this face
 * with Plus". Nothing about faces exists while plus_enabled is false.
 */
export function TimerFaceScreen({ navigation }: RootStackScreenProps<'TimerFace'>) {
  const view = useView();
  const { look, myLook, setLook } = useApp();
  const unlocked = view.plus.visible && view.plus.active;
  const [tryOn, setTryOn] = useState<TimerFace | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const saved = unlocked ? myLook.timerFace : look.timerFace;
  const shown = tryOn ?? saved;
  const faces = view.plus.visible ? TIMER_FACES : TIMER_FACES.filter((f) => !f.plus);
  const nameOf = (id: TimerFace) => TIMER_FACES.find((f) => f.id === id)?.name ?? '';

  const pick = (face: TimerFace) => {
    setLine(null);
    const meta = TIMER_FACES.find((f) => f.id === face);
    if (meta?.plus && !unlocked) {
      setTryOn(face === saved ? null : face);
      return;
    }
    setTryOn(null);
    if (face === saved) return;
    setLook({ timerFace: face });
    setLine(TIMER_FACE_COPY.saved(nameOf(face)));
  };

  React.useEffect(() => {
    if (!devDriverOn) return;
    const sub = DeviceEventEmitter.addListener('pickFace', (f: TimerFace) => pick(f));
    return () => sub.remove();
  });

  return (
    <SubScreen
      title={TIMER_FACE_COPY.title}
      lead={TIMER_FACE_COPY.lead}
      onBack={() => navigation.goBack()}
      footer={
        tryOn ? (
          <>
            <SolidButton title={TIMER_FACE_COPY.keep} onPress={() => navigation.navigate('Plus', { focus: 'timerFace', face: tryOn })} />
            <TextAction label={TIMER_FACE_COPY.back(nameOf(saved))} onPress={() => setTryOn(null)} style={styles.back} />
          </>
        ) : undefined
      }
    >
      <FaceRoom face={shown} />
      {tryOn ? <Text style={[type.label, styles.trying]}>{TIMER_FACE_COPY.tryingOn}</Text> : null}

      <Text style={[type.caption, styles.label]}>{TIMER_FACE_COPY.faces}</Text>
      <ChoiceList
        accessibilityLabel={TIMER_FACE_COPY.faces}
        value={shown}
        onChange={pick}
        items={faces.map((f) => ({
          value: f.id,
          title: f.name,
          subtitle: !f.plus ? f.detail : unlocked ? `${f.detail}. ${TIMER_FACE_COPY.plusFace}` : `${f.detail}. ${TIMER_FACE_COPY.tryOn}`,
          leading: <FaceSwatch face={f.id} />,
        }))}
      />
      {line ? <Text style={[type.bodySmall, styles.line]}>{line}</Text> : null}
    </SubScreen>
  );
}

/** The room, small: the face at 12:40 of 15. */
function FaceRoom({ face }: { face: TimerFace }) {
  const radius = 104;
  const size = (radius + ARC_PAD) * 2;
  const brass = face === 'brass';
  return (
    <View style={[styles.room, { backgroundColor: faceRoom(face) }]} accessible accessibilityLabel={`The ${face === 'loyly' ? 'Löyly' : face === 'coal' ? 'Coal' : 'Brass'} timer face at 12 minutes 40`}>
      <Text style={[type.caption, styles.roomCaps]}>In the heat · Round 1</Text>
      {brass ? (
        <View style={styles.brassBox}>
          <TimerDial face="brass" radius={radius * 0.8} progress={SAMPLE.heatMs / (SAMPLE.target * 60_000)} heatMs={SAMPLE.heatMs} targetMinutes={SAMPLE.target} />
          <FixedDigits value="12:40" variant="heading" color={faceNumerals(face)} />
        </View>
      ) : (
        <View style={[styles.dialBox, { height: size }]}>
          <TimerDial face={face} radius={radius} progress={SAMPLE.heatMs / (SAMPLE.target * 60_000)} heatMs={SAMPLE.heatMs} targetMinutes={SAMPLE.target} />
          <View style={styles.overlay}>
            <FixedDigits value="12:40" variant="display" color={faceNumerals(face)} />
          </View>
        </View>
      )}
      <Text style={[type.caption, styles.roomCaps]}>Traditional · 15 min</Text>
    </View>
  );
}

function FaceSwatch({ face }: { face: TimerFace }) {
  return (
    <View style={[styles.swatch, { backgroundColor: faceRoom(face) }]}>
      <TimerDial face={face} radius={13} progress={0.84} heatMs={SAMPLE.heatMs} targetMinutes={SAMPLE.target} />
    </View>
  );
}

const styles = StyleSheet.create({
  room: { borderRadius: radii.card, borderCurve: 'continuous', paddingVertical: space.s24, alignItems: 'center', overflow: 'hidden' },
  roomCaps: { color: alpha.steam62 },
  dialBox: { width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: space.s12 },
  brassBox: { alignItems: 'center', marginVertical: space.s4 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  trying: { marginTop: space.s12, textAlign: 'center' },
  label: { marginTop: space.s32, marginBottom: space.s8, marginHorizontal: space.s8 },
  swatch: { width: 44, height: 44, borderRadius: radii.slat, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  line: { color: palette.smoke, marginTop: space.s12, marginHorizontal: space.s8 },
  back: { marginTop: space.s8 },
});
