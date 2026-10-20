import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { ChoiceList } from '../components/ChoiceList';
import { Slat } from '../components/Slat';
import { SlatWall, WallWeek } from '../components/SlatWall';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { WallWood } from '../data/types';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { NeedsPlusError } from '../state/backend';
import { AppView } from '../state/buildView';

export const WOOD_NAMES: Record<WallWood, string> = {
  birch: 'Birch',
  cedar: 'Cedar',
  alder: 'Alder',
  charred_pine: 'Charred pine',
};

const PLUS_WOODS: WallWood[] = ['cedar', 'alder', 'charred_pine'];

export const WALL_COPY = {
  title: 'The wall',
  lead: (family: string) => `The wood your family’s weeks are built from. Everyone in ${family} sees the same wall.`,
  woods: 'Wall wood',
  birch: 'Free, always',
  plusWood: 'Included with Plus',
  tryOn: 'Tap to try it on',
  tryingOn: 'Trying it on. Nothing is saved.',
  keep: 'Keep this wood with Plus',
  back: (wood: string) => `Back to ${wood.toLowerCase()}`,
  saved: (wood: string, family: string) => `Saved. ${family} has a ${wood.toLowerCase()} wall now.`,
  failed: 'Couldn’t change the wall. Check your connection and try again.',
};

/** The family's last 12 weeks as wall slats, oldest first: kept in ember, frozen in lake, this week with its dots. */
export function wallWeeks(view: AppView): WallWeek[] {
  return view.week.wall.slats.slice(-12).map((s) => {
    if (s.current) return { state: 'current', dots: { filled: view.today.you.countedDays, count: view.today.you.goal } };
    if (s.state === 'counted') return { state: s.freezeUsed ? 'frozen' : 'kept' };
    if (s.state === 'skip') return { state: 'paused' };
    return { state: 'open' };
  });
}

/**
 * Settings > The wall (spec, Settings and Paid tier). Birch is free. Cedar,
 * alder and charred pine show only with app_config.plus_enabled; without Plus,
 * tapping one tries it on (the wall above turns that wood while you're here,
 * nothing saved) with "Keep this wood with Plus".
 *
 * Seam for M15: that button opens the Plus route with `{ focus: 'woods' }`.
 * M15 replaces src/screens/PlusSeamScreen.tsx with the real sheet.
 */
export function WallScreen({ navigation }: RootStackScreenProps<'Wall'>) {
  const view = useView();
  const { setWallWood } = useApp();
  const [tryOn, setTryOn] = useState<WallWood | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const weeks = useMemo(() => wallWeeks(view), [view]);
  const saved = view.plus.wood;
  const shown = tryOn ?? saved;
  const woods: WallWood[] = view.plus.visible ? ['birch', ...PLUS_WOODS] : ['birch'];

  const pick = async (wood: WallWood) => {
    setLine(null);
    if (wood !== 'birch' && !view.plus.active) {
      setTryOn(wood === saved ? null : wood);
      return;
    }
    setTryOn(null);
    if (wood === saved) return;
    try {
      await setWallWood(wood);
      setLine(WALL_COPY.saved(WOOD_NAMES[wood], view.familyName));
    } catch (e) {
      if (e instanceof NeedsPlusError) setTryOn(wood);
      else setLine(WALL_COPY.failed);
    }
  };

  return (
    <SubScreen
      title={WALL_COPY.title}
      lead={WALL_COPY.lead(view.familyName)}
      onBack={() => navigation.goBack()}
      footer={
        tryOn ? (
          <>
            <SolidButton title={WALL_COPY.keep} onPress={() => navigation.navigate('Plus', { focus: 'woods' })} />
            <TextAction label={WALL_COPY.back(WOOD_NAMES[saved])} onPress={() => setTryOn(null)} style={styles.back} />
          </>
        ) : undefined
      }
    >
      <Card padding={20}>
        <SlatWall weeks={weeks} wood={shown} />
        {tryOn ? <Text style={[type.label, styles.trying]}>{WALL_COPY.tryingOn}</Text> : null}
      </Card>

      <Text style={[type.caption, styles.label]}>{WALL_COPY.woods}</Text>
      <ChoiceList
        accessibilityLabel={WALL_COPY.woods}
        value={shown}
        onChange={pick}
        items={woods.map((w) => ({
          value: w,
          title: WOOD_NAMES[w],
          subtitle: w === 'birch' ? WALL_COPY.birch : view.plus.active ? WALL_COPY.plusWood : WALL_COPY.tryOn,
          leading: (
            <View style={styles.swatch}>
              <Slat state="kept" wood={w} height={21} seed={3} />
              <Slat state="open" wood={w} height={21} seed={5} style={styles.swatchGap} />
            </View>
          ),
        }))}
      />
      {line ? <Text style={[type.bodySmall, styles.line]}>{line}</Text> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  trying: { marginTop: space.s12, textAlign: 'center' },
  label: { marginTop: space.s32, marginBottom: space.s8, marginHorizontal: space.s8 },
  swatch: { width: 56 },
  swatchGap: { marginTop: space.s4 },
  line: { color: palette.smoke, marginTop: space.s12, marginHorizontal: space.s8 },
  back: { marginTop: space.s8 },
});
