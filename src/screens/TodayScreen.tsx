import React from 'react';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { PersonTap } from '../state/buildView';
import { StartSessionButton } from '../components/StartSessionButton';
import { TimerBar } from '../components/TimerBar';
import { Btn, H, P, PlainScreen, Row, dotsText } from './plain';

/**
 * Today, as plain text until M9 builds it: your slat, the family line, the
 * streak, the timer, "Forgot one?" and the family list, all from view.today.
 */
export function TodayScreen({ navigation }: MainTabScreenProps<'Today'>) {
  const view = useView();
  const { refresh } = useApp();
  const t = view.today;

  const tap = (target: PersonTap) => {
    if (target.kind === 'nudge') navigation.navigate('Nudge', { memberId: target.memberId });
    else if (target.kind === 'session') navigation.navigate('SessionDetail', { sessionId: target.sessionId });
    else if (target.kind === 'invite') navigation.navigate('Invite');
  };

  return (
    <PlainScreen title={t.greeting} onRefresh={refresh}>
      <P muted>{t.dateLabel}</P>
      {view.updateRequired ? <P strong>A new version of Saunafam is ready. Update in TestFlight or the App Store.</P> : null}
      {/* M8: the timer bar and the Start button. M9 places them in the real Today. */}
      <TimerBar />

      <H>This week</H>
      <P strong>
        {dotsText(t.you.dots)} {t.you.label}
      </P>
      {t.familyLine ? <P>{t.familyLine}</P> : null}
      <P>
        {t.streak.value} {t.streak.label}
      </P>
      {t.backAtIt ? (
        <P>
          {t.backAtIt.title}. {t.backAtIt.body}
        </P>
      ) : null}
      {t.soloInvite ? <Row label={t.soloInvite.title} value={t.soloInvite.action} onPress={() => navigation.navigate('Invite')} /> : null}
      {view.milestone ? <Row label={view.milestone.title} value="Open" onPress={() => navigation.navigate('Milestone')} /> : null}

      <StartSessionButton />
      <Btn title="Log one I already did" onPress={() => navigation.navigate('LogSession')} />
      {t.forgot ? <Btn title={t.forgot.label} onPress={() => navigation.navigate('LogSession', { day: 'yesterday' })} /> : null}
      {t.waiting ? <P muted>{t.waiting === 1 ? '1 session waiting to send' : `${t.waiting} sessions waiting to send`}</P> : null}
      {t.drafts.map((d) => (
        <Row key={d.clientId} label={d.label} onPress={() => navigation.navigate('LogSession', { draftId: d.clientId })} />
      ))}

      <H>Family</H>
      {t.family.map((r) => (
        <Row key={r.member.id} label={`${r.member.name}  ${dotsText(r.dots)}`} value={r.status} onPress={r.tap.kind === 'none' ? undefined : () => tap(r.tap)} />
      ))}
      <Btn title="Settings" onPress={() => navigation.navigate('Settings')} />
    </PlainScreen>
  );
}
