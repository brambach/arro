import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import type { HeatSession } from '../state/heatLog';
import { HeatLog, heatLog, hoursLabel, sampleHeatLog } from '../state/heatLog';
import { alpha, palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { FixedDigits } from '../components/FixedDigits';
import { RowsSkeleton } from '../components/Skeleton';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { PLUS_COPY } from '../state/plusFlow';

export const HEAT_LOG_COPY = {
  title: 'Heat log',
  lead: (family: string) => `${family} in the heat, together.`,
  hours: 'Hours in the heat',
  hoursYear: (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'} this year`,
  months: 'The last 12 months',
  types: 'Sessions by type',
  places: 'Where',
  noPlaces: 'Add a place when you log, and it shows here.',
  bestRun: 'Your best run',
  weeks: (n: number) => (n === 1 ? 'week in a row' : 'weeks in a row'),
  longest: 'Longest session',
  longestNote: 'Everyone’s longest, in alphabetical order.',
  empty: 'Your heat log fills in as your family logs sessions.',
  failed: 'Couldn’t load the heat log. Check your connection and try again.',
  tryAgain: 'Try again',
  lockedTitle: 'Your family’s heat log comes with Plus',
  lockedBody: 'Hours by month, where and how you sauna, and your best run. These numbers are an example.',
  seePlus: 'See Plus',
};

/**
 * Me > Heat log (Plus): hours in the heat by month, sessions by type and place,
 * the family's best run, everyone's longest session (alphabetical, no
 * ranking). Without Plus it's a blurred preview of made-up numbers with the
 * way to the Plus sheet below it, never the family's own numbers.
 */
export function HeatLogScreen({ navigation }: RootStackScreenProps<'HeatLog'>) {
  const view = useView();
  const { loadArchive } = useApp();
  const unlocked = view.plus.visible && view.plus.active;
  const [sessions, setSessions] = useState<HeatSession[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    loadArchive()
      .then((a) => {
        if (alive) setSessions(a.sessions);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [loadArchive, attempt, unlocked]);
  const load = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const bestRun = view.week.numbers.find((n) => n.key === 'longest')?.value ?? 0;
  const log = useMemo(
    () => (unlocked ? (sessions ? heatLog(sessions, view.allMembers.filter((m) => m.joinedOn !== null), bestRun, view.todayKey) : null) : sampleHeatLog(view.todayKey)),
    [unlocked, sessions, view.allMembers, bestRun, view.todayKey],
  );

  return (
    <SubScreen title={HEAT_LOG_COPY.title} lead={HEAT_LOG_COPY.lead(view.familyName)} onBack={() => navigation.goBack()}>
      {failed ? (
        <Card>
          <Text style={type.bodySmall}>{HEAT_LOG_COPY.failed}</Text>
          <TextAction label={HEAT_LOG_COPY.tryAgain} onPress={load} tone="coal" size="bodySmall" style={styles.retry} />
        </Card>
      ) : !log ? (
        <View accessible accessibilityLabel="Loading the heat log">
          <RowsSkeleton rows={4} rowHeight={72} />
        </View>
      ) : log.empty ? (
        <Card>
          <Text style={type.bodySmall}>{HEAT_LOG_COPY.empty}</Text>
        </Card>
      ) : unlocked ? (
        <Stats log={log} members={view.members} />
      ) : (
        <>
          <View style={styles.locked} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Stats log={log} members={view.members} />
            <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFill} />
          </View>
          <Card style={styles.lockCard} float>
            <Text style={type.heading}>{HEAT_LOG_COPY.lockedTitle}</Text>
            <Text style={[type.bodySmall, styles.gap8]}>{HEAT_LOG_COPY.lockedBody}</Text>
            <SolidButton title={HEAT_LOG_COPY.seePlus} onPress={() => navigation.navigate('Plus', { focus: 'heatLog' })} style={styles.gap16} />
            <Text style={[type.label, styles.gap8]}>{PLUS_COPY.covers(view.familyName)}</Text>
          </Card>
        </>
      )}
    </SubScreen>
  );
}

function Stats({ log, members }: { log: HeatLog; members: ReturnType<typeof useView>['members'] }) {
  return (
    <>
      <Card>
        <Text style={type.caption}>{HEAT_LOG_COPY.hours}</Text>
        <Text style={[type.heading, styles.gap8]}>{HEAT_LOG_COPY.hoursYear(log.hoursThisYear)}</Text>
        <View style={styles.bars} accessible accessibilityLabel={`${HEAT_LOG_COPY.months}: ${log.months.map((m) => `${m.label} ${hoursLabel(m.minutes)}`).join(', ')}`}>
          {log.months.map((m) => (
            <View key={m.key} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${log.maxMinutes ? Math.max(4, (m.minutes / log.maxMinutes) * 100) : 0}%` }, m.minutes === 0 && styles.barEmpty]} />
              </View>
              <Text style={[type.label, styles.barLabel]} maxFontSizeMultiplier={1.2}>
                {m.label.charAt(0)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.twoUp}>
        <Card style={styles.half}>
          <Text style={type.caption}>{HEAT_LOG_COPY.bestRun}</Text>
          <View style={styles.bigNumber}>
            <FixedDigits value={String(log.bestRun)} variant="display" color={palette.coal} accessibilityLabel={`${log.bestRun} ${HEAT_LOG_COPY.weeks(log.bestRun)}`} />
          </View>
          <Text style={type.label}>{HEAT_LOG_COPY.weeks(log.bestRun)}</Text>
        </Card>
        <Card style={styles.half}>
          <Text style={type.caption}>{HEAT_LOG_COPY.types}</Text>
          {log.types.slice(0, 4).map((t) => (
            <View key={t.type} style={styles.countRow}>
              <Text style={[type.bodySmall, styles.countName]} numberOfLines={1}>
                {t.label}
              </Text>
              <Text style={type.bodySmallStrong}>{t.count}</Text>
            </View>
          ))}
        </Card>
      </View>

      <Card style={styles.block}>
        <Text style={type.caption}>{HEAT_LOG_COPY.places}</Text>
        {log.places.length ? (
          log.places.map((p) => (
            <View key={p.place} style={styles.countRow}>
              <Text style={[type.body, styles.countName]} numberOfLines={1}>
                {p.place}
              </Text>
              <Text style={type.bodySmall}>{p.count === 1 ? '1 session' : `${p.count} sessions`}</Text>
            </View>
          ))
        ) : (
          <Text style={[type.bodySmall, styles.gap8]}>{HEAT_LOG_COPY.noPlaces}</Text>
        )}
      </Card>

      {log.longest.length ? (
        <Card style={styles.block}>
          <Text style={type.caption}>{HEAT_LOG_COPY.longest}</Text>
          <Text style={[type.label, styles.gap4]}>{HEAT_LOG_COPY.longestNote}</Text>
          {log.longest.map((l) => {
            const m = members[l.memberId];
            return (
              <View key={l.memberId} style={styles.person} accessible accessibilityLabel={`${l.name}, ${l.minutes} minutes, ${l.date}`}>
                {m ? <Avatar name={m.name} color={m.color} photoUri={typeof m.photoUri === 'string' ? m.photoUri : null} size={32} /> : null}
                <Text style={[type.body, styles.countName]}>{m?.isMe ? 'You' : l.name}</Text>
                <View style={styles.right}>
                  <Text style={type.bodyStrong}>{l.minutes} min</Text>
                  <Text style={type.label}>{l.date}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
  locked: { borderRadius: radii.card, overflow: 'hidden' },
  lockCard: { marginTop: space.s16 },
  gap4: { marginTop: space.s4 },
  gap8: { marginTop: space.s8 },
  gap16: { marginTop: space.s16 },
  block: { marginTop: space.s12 },
  bars: { flexDirection: 'row', gap: space.s4, height: 120, marginTop: space.s16 },
  barCol: { flex: 1, alignItems: 'center', gap: space.s4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: radii.slatSmall, backgroundColor: palette.aspen, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: palette.ember, borderRadius: radii.slatSmall },
  barEmpty: { height: 0 },
  barLabel: { color: palette.smoke },
  twoUp: { flexDirection: 'row', gap: space.s12, marginTop: space.s12 },
  half: { flex: 1 },
  bigNumber: { marginTop: space.s8 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8, marginTop: space.s8 },
  countName: { flex: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s12, paddingTop: space.s12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha.hairline },
  right: { alignItems: 'flex-end' },
});
