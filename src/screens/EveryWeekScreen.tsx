import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import type { PastWeekRow } from '../data/types';
import { monthRows } from '../state/archive';
import { pastWeekViews } from '../state/buildView';
import { space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { ListGroup, ListRow } from '../components/ListRow';
import { RowsSkeleton } from '../components/Skeleton';
import { Slat } from '../components/Slat';
import { SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';

export const EVERY_WEEK_COPY = {
  title: 'Every week',
  lead: (family: string, weeks: number) => `${family}’s whole wall: ${weeks} ${weeks === 1 ? 'week' : 'weeks'} since the first.`,
  loading: 'Loading every week',
  failed: 'Couldn’t load every week. Check your connection and try again.',
  tryAgain: 'Try again',
  empty: 'Your first week is on the wall. Once it closes, it shows here.',
  kept: (kept: number, of: number) => `${kept} of ${of} kept`,
  weeks: 'Weeks',
};

/**
 * Week > See every week (Plus): the wall back to the family's first Saunafam
 * week, month by month (each month's weeks side by side in the family's wood),
 * then every week as a row. The server returns more than 12 weeks only while
 * the family has Plus (family_week_history clamps), so this never shows more
 * than it should.
 */
export function EveryWeekScreen({ navigation }: RootStackScreenProps<'EveryWeek'>) {
  const view = useView();
  const { loadArchive } = useApp();
  const [history, setHistory] = useState<PastWeekRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadArchive()
      .then((a) => {
        if (alive) setHistory(a.history);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [loadArchive, attempt]);
  const load = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const myId = view.me.id;
  const months = useMemo(() => (history ? monthRows(history, myId) : []), [history, myId]);
  const rows = useMemo(() => (history ? pastWeekViews(history, view.members, myId) : []), [history, view.members, myId]);
  const total = months.reduce((n, m) => n + m.weeks.length, 0);
  const wood = view.week.wall.wood;

  return (
    <SubScreen
      title={EVERY_WEEK_COPY.title}
      lead={history ? EVERY_WEEK_COPY.lead(view.familyName, total) : undefined}
      onBack={() => navigation.goBack()}
    >
      {failed ? (
        <Card>
          <Text style={type.bodySmall}>{EVERY_WEEK_COPY.failed}</Text>
          <TextAction label={EVERY_WEEK_COPY.tryAgain} onPress={load} tone="coal" size="bodySmall" style={styles.retry} />
        </Card>
      ) : !history ? (
        <View accessible accessibilityLabel={EVERY_WEEK_COPY.loading}>
          <RowsSkeleton rows={4} rowHeight={56} />
        </View>
      ) : !months.length ? (
        <Card>
          <Text style={type.bodySmall}>{EVERY_WEEK_COPY.empty}</Text>
        </Card>
      ) : (
        <>
          <Card padding={space.s20}>
            {months.map((m, i) => (
              <View
                key={m.key}
                style={i > 0 ? styles.monthGap : undefined}
                accessible
                accessibilityLabel={`${m.label}: ${EVERY_WEEK_COPY.kept(m.kept, m.weeks.length)}`}
              >
                <View style={styles.monthHead}>
                  <Text style={type.caption}>{m.label}</Text>
                  <Text style={type.label}>{EVERY_WEEK_COPY.kept(m.kept, m.weeks.length)}</Text>
                </View>
                <View style={styles.slats}>
                  {m.weeks.map((w, j) => (
                    <Slat key={w.weekStart} state={w.look} wood={wood} height={21} seed={i * 5 + j} style={styles.slat} />
                  ))}
                  {/* Keep a short month's slats the same width as a full one. */}
                  {Array.from({ length: Math.max(0, 5 - m.weeks.length) }, (_, k) => (
                    <View key={`gap${k}`} style={styles.slat} />
                  ))}
                </View>
              </View>
            ))}
          </Card>

          <Text style={[type.caption, styles.label]}>{EVERY_WEEK_COPY.weeks}</Text>
          <ListGroup>
            {rows.map((r) => (
              <ListRow key={r.weekStart} title={r.title} value={r.outcome} valueTone="quiet" />
            ))}
          </ListGroup>
        </>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  monthGap: { marginTop: space.s16 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.s8 },
  slats: { flexDirection: 'row', gap: space.s4 },
  slat: { flex: 1 },
  label: { marginTop: space.s32, marginBottom: space.s8, marginHorizontal: space.s8 },
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
});
