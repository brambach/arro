import React, { useEffect, useState } from 'react';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { PLUS_CARD_COPY } from '../state/plus';
import { Btn, H, P, PlainScreen, Row, dotsText } from './plain';

/** The Week tab, as plain text until M9 builds the wall: view.week. */
export function ThisWeekScreen({ navigation }: MainTabScreenProps<'ThisWeek'>) {
  const view = useView();
  const { refresh, recordNagShown, dismissNag, turnOffNag } = useApp();
  const w = view.week;
  const [open, setOpen] = useState<string | null>(null);
  // A new showing of the quiet card is recorded when it's on screen.
  useEffect(() => {
    if (w.nag === 'new') recordNagShown();
  }, [w.nag, recordNagShown]);

  return (
    <PlainScreen title="Week" onRefresh={refresh}>
      <P>
        Wall ({w.wall.wood}): {w.wall.slats.map((s) => (s.current ? '▢' : s.state === 'counted' ? (s.freezeUsed ? '❄' : '▮') : s.state === 'broken' ? '▯' : '·')).join(' ')}
      </P>
      {w.numbers.map((n) => (
        <Row key={n.key} label={n.label} value={`${n.value}`} />
      ))}

      <H>This week</H>
      {w.rows.map((r) => (
        <Row key={r.member.id} label={`${r.member.name}  ${dotsText(r.dots)}`} value={r.status} />
      ))}
      <P>{w.myStrip.map((d) => `${d.letter}${d.went ? '●' : d.future ? '·' : '○'}`).join('  ')}</P>

      <H>Past weeks</H>
      {w.past.map((p) => (
        <React.Fragment key={p.weekStart}>
          <Row label={p.label} onPress={() => setOpen(open === p.weekStart ? null : p.weekStart)} />
          {open === p.weekStart
            ? p.members.map((m) => <P key={m.member.id} muted>{`${m.member.name}: ${m.status}${m.daysLabel ? ` (${m.daysLabel})` : ''}`}</P>)
            : null}
        </React.Fragment>
      ))}
      {w.seeEveryWeek ? <Btn title="See every week" onPress={() => undefined} /> : null}
      {w.printWall ? <Btn title="Print the wall" onPress={() => undefined} /> : null}
      {w.nag !== 'hidden' ? (
        <>
          <P>{PLUS_CARD_COPY.body}</P>
          <Btn title={PLUS_CARD_COPY.action} onPress={() => undefined} />
          <Btn title={PLUS_CARD_COPY.notNow} onPress={dismissNag} />
          <Btn title={PLUS_CARD_COPY.never} onPress={turnOffNag} />
        </>
      ) : null}
      <Btn title="Streak rules" onPress={() => navigation.navigate('StreakRules')} />
    </PlainScreen>
  );
}
