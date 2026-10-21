import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { FamilyRow, PersonTap, TodayView } from '../state/buildView';
import { healthAvailable } from '../state/health';
import { setHealthEnabled } from '../state/healthSettings';
import { HEALTH_OFFER_COPY, HealthOfferAnswer, healthOfferDue, loadHealthOffer, saveHealthOffer } from '../state/healthOffer';
import { layout, palette, radii, space } from '../theme/tokens';
import { moments } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';
import { Arrive } from '../components/Arrive';
import { AvatarProgress } from '../components/AvatarProgress';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ListGroup, ListRow } from '../components/ListRow';
import { NoticeToast } from '../components/NoticeToast';
import { PersonRow, rowHint } from '../components/PersonRow';
import { Screen } from '../components/Screen';
import { Bone, RowsSkeleton } from '../components/Skeleton';
import { SolidButton } from '../components/SolidButton';
import { StartSessionButton } from '../components/StartSessionButton';
import { StatusNote } from '../components/StatusNote';
import { TextAction } from '../components/TextAction';
import { TimerBar } from '../components/TimerBar';
import { WeekHero } from '../components/WeekHero';
import { useShownWhenFocused } from '../components/useShownWhenFocused';

/**
 * Today (spec, section 3): the date and greeting with your avatar, the This
 * week hero (the family streak, your slat, "2 of 3 this week", the family
 * line), Start a session and Log one I already did, Forgot one?, and the
 * family list. Everything comes from view.today, cache first.
 *
 * Arrival (Key motion moment 2): one settle, 70 ms apart, in order: greeting,
 * this week's slat, the Start button, the family list; the streak number rolls
 * in. A save plays the check-in on the hero when the sheet has closed.
 */
export function TodayScreen({ navigation }: MainTabScreenProps<'Today'>) {
  const view = useView();
  const { refresh } = useApp();
  // Changes made while the log sheet covers Today arrive once it's gone, so the moment is seen.
  const t = useShownWhenFocused(view.today);

  const tap = (target: PersonTap) => {
    if (target.kind === 'nudge') navigation.navigate('Nudge', { memberId: target.memberId });
    else if (target.kind === 'session') navigation.navigate('SessionDetail', { sessionId: target.sessionId });
    else if (target.kind === 'invite') navigation.navigate('Invite');
  };

  useMilestoneWhenDue(view.milestone !== null, () => navigation.navigate('Milestone'));

  const ready = view.status === 'ready';
  const meProgress = t.you.goal ? Math.min(1, t.you.countedDays / t.you.goal) : 0;

  return (
    <View style={styles.root}>
      <Screen onRefresh={refresh} contentStyle={styles.content}>
        {view.timer ? (
          <View style={styles.timerBar}>
            <TimerBar />
          </View>
        ) : null}

        <Arrive index={0}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={type.caption}>{t.dateLabel}</Text>
              <Text style={[type.title, styles.greeting]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
                {t.greeting}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Me')}
              accessibilityRole="button"
              accessibilityLabel={`You, ${t.you.label}`}
              accessibilityHint="Opens Me"
              hitSlop={space.s8}
            >
              <AvatarProgress
                name={view.me.name}
                color={view.me.color}
                photoUri={typeof view.me.photoUri === 'string' ? view.me.photoUri : null}
                progress={t.you.kept ? 1 : meProgress}
              />
            </Pressable>
          </View>
        </Arrive>

        <Notes offline={view.offline && ready} waiting={t.waiting} />

        {view.status === 'loading' ? (
          <TodaySkeleton />
        ) : view.status === 'error' ? (
          <LoadError onRetry={refresh} />
        ) : (
          <TodayBody
            today={t}
            wood={view.plus.wood}
            onTap={tap}
            onInvite={() => navigation.navigate('Invite')}
            onLog={(day) => navigation.navigate('LogSession', day ? { day } : undefined)}
            onDraft={(id) => navigation.navigate('LogSession', { draftId: id })}
            savedSessions={view.profile.recent.filter((c) => !c.pending).length}
          />
        )}
      </Screen>
      <NoticeToast />
    </View>
  );
}

function TodayBody({
  today: t,
  wood,
  onTap,
  onInvite,
  onLog,
  onDraft,
  savedSessions,
}: {
  today: TodayView;
  wood: Parameters<typeof WeekHero>[0]['wood'];
  onTap: (tap: PersonTap) => void;
  onInvite: () => void;
  onLog: (day?: 'yesterday') => void;
  onDraft: (clientId: string) => void;
  savedSessions: number;
}) {
  return (
    <>
      <View style={styles.hero}>
        <WeekHero today={t} wood={wood} arrive onInvite={onInvite} />
      </View>

      {t.backAtIt ? (
        <Arrive index={1}>
          <Card style={styles.backAtIt}>
            <Text style={type.heading} maxFontSizeMultiplier={maxFontScale.heading}>
              {t.backAtIt.title}
            </Text>
            <Text style={[type.bodySmall, styles.backAtItBody]}>{t.backAtIt.body}</Text>
          </Card>
        </Arrive>
      ) : null}

      <Arrive index={2} style={styles.start}>
        <StartSessionButton />
        <TextAction label="Log one I already did" onPress={() => onLog()} size="bodySmall" style={styles.logOne} />
      </Arrive>

      {t.forgot || t.drafts.length ? (
        <Arrive index={2} style={styles.block}>
          <ListGroup inset="leading">
            {[
              ...(t.forgot
                ? [
                    <ListRow
                      key="forgot"
                      title={t.forgot.label}
                      subtitle={t.forgot.kind === 'lastDay' ? 'It still counts toward last week' : 'Forgot one? It still counts'}
                      leading={<RowIcon name="calendar" />}
                      onPress={() => onLog('yesterday')}
                    />,
                  ]
                : []),
              ...t.drafts.map((d) => {
                const [title, rest] = splitSentence(d.label);
                return (
                  <ListRow
                    key={d.clientId}
                    title={title}
                    subtitle={rest ?? undefined}
                    leading={<RowIcon name="pencil" tone="coal" />}
                    onPress={() => onDraft(d.clientId)}
                  />
                );
              }),
            ]}
          </ListGroup>
        </Arrive>
      ) : null}

      <Arrive index={3}>
        <Text style={[type.caption, styles.label]} accessibilityRole="header">
          Family
        </Text>
        <ListGroup inset="leading">
          {t.family.map((r: FamilyRow) => (
            <PersonRow key={r.member.id} row={r} onPress={r.tap.kind === 'none' ? undefined : () => onTap(r.tap)} hint={rowHint(r)} />
          ))}
        </ListGroup>
      </Arrive>

      <HealthOffer savedSessions={savedSessions} />
    </>
  );
}

/** "Couldn’t save this one. Tap to fix it" as a title and a second line. */
function splitSentence(s: string): [string, string | null] {
  const at = s.indexOf('. ');
  return at < 0 ? [s, null] : [s.slice(0, at), s.slice(at + 2)];
}

function RowIcon({ name, tone = 'stone' }: { name: 'calendar' | 'pencil'; tone?: 'stone' | 'coal' }) {
  return (
    <View style={styles.rowIcon}>
      <Icon name={name} size={22} color={tone === 'coal' ? palette.coal : palette.smoke} />
    </View>
  );
}

function Notes({ offline, waiting }: { offline: boolean; waiting: number }) {
  if (!offline && !waiting) return null;
  const text = offline
    ? waiting
      ? `You’re offline. ${waiting === 1 ? 'One session is' : `${waiting} sessions are`} saved here and will send when you’re back.`
      : 'You’re offline. Anything you log is saved here and sends when you’re back.'
    : waiting === 1
      ? 'One session is waiting to send.'
      : `${waiting} sessions are waiting to send.`;
  return (
    <View style={styles.notes}>
      <StatusNote icon={offline ? 'pause' : 'timer'} text={text} />
    </View>
  );
}

/** "Save sessions to Apple Health?" once, after your first saved session. Turn on asks iOS and writes (health.ts). */
function HealthOffer({ savedSessions }: { savedSessions: number }) {
  const { syncHealth } = useApp();
  const [answer, setAnswer] = useState<HealthOfferAnswer | null | 'unknown'>('unknown');
  useEffect(() => {
    let alive = true;
    loadHealthOffer().then((a) => alive && setAnswer(a));
    return () => {
      alive = false;
    };
  }, []);
  if (answer === 'unknown') return null;
  if (!healthOfferDue({ answer, savedSessions, available: healthAvailable() })) return null;
  const answerWith = (a: HealthOfferAnswer) => {
    setAnswer(a);
    saveHealthOffer(a).catch(() => undefined);
    // Turn on: the same switch as Settings, then iOS's Health sheet, then the session that earned the card.
    if (a === 'on') {
      setHealthEnabled(true)
        .then((p) => p === 'granted' && syncHealth())
        .catch(() => undefined);
    }
  };
  return (
    <Arrive index={3} style={styles.health}>
      <Card>
        <View style={styles.healthHead}>
          <Icon name="droplet" size={22} color={palette.coal} />
          <Text style={[type.bodyStrong, styles.healthTitle]}>{HEALTH_OFFER_COPY.title}</Text>
        </View>
        <Text style={[type.bodySmall, styles.healthBody]}>{HEALTH_OFFER_COPY.body}</Text>
        <View style={styles.healthActions}>
          <SolidButton title={HEALTH_OFFER_COPY.turnOn} onPress={() => answerWith('on')} fill={false} />
          <TextAction label={HEALTH_OFFER_COPY.notNow} onPress={() => answerWith('notNow')} size="bodySmall" />
        </View>
      </Card>
    </Arrive>
  );
}

/** The milestone card, once, a beat after Today has arrived. */
function useMilestoneWhenDue(due: boolean, open: () => void) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!due || !focused) return;
    const wait = moments.todayArrival.duration + moments.todayArrival.stagger * 3;
    const timer = setTimeout(open, wait);
    return () => clearTimeout(timer);
    // `open` is a new function each render; the due milestone and focus are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, focused]);
}

function TodaySkeleton() {
  return (
    <View accessible accessibilityLabel="Loading your family">
      <Card style={styles.hero}>
        <Bone width={160} height={48} />
        <Bone width="100%" height={54} radius={radii.slat} style={styles.skeletonSlat} />
        <Bone width={150} height={16} style={styles.skeletonLine} />
        <Bone width="80%" height={12} style={styles.skeletonLine} />
      </Card>
      <View style={styles.start}>
        <Bone width="100%" height={layout.buttonTall} radius={radii.button} />
      </View>
      <Text style={[type.caption, styles.label]}>Family</Text>
      <RowsSkeleton rows={3} />
    </View>
  );
}

function LoadError({ onRetry }: { onRetry: () => Promise<unknown> }) {
  return (
    <Card style={styles.hero}>
      <Text style={type.heading} maxFontSizeMultiplier={maxFontScale.heading}>
        Couldn’t load your family
      </Text>
      <Text style={[type.bodySmall, styles.backAtItBody]}>
        Check your connection and try again. Anything you log now is saved on this phone and sends later.
      </Text>
      <TextAction label="Try again" onPress={() => void onRetry()} tone="coal" size="bodySmall" style={styles.retry} />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space.s40 },
  timerBar: { marginBottom: space.s12 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s12, paddingHorizontal: space.s8, paddingTop: space.s8 },
  headerText: { flex: 1 },
  greeting: { marginTop: space.s4 },
  notes: { paddingHorizontal: space.s8, marginTop: space.s12 },
  hero: { marginTop: space.s20 },
  backAtIt: { marginTop: space.s12 },
  backAtItBody: { marginTop: space.s8 },
  start: { marginTop: space.s20 },
  logOne: { marginTop: space.s8 },
  block: { marginTop: space.s16 },
  rowIcon: { width: 38, height: 38, borderRadius: radii.round, backgroundColor: palette.aspen, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: space.s32, marginBottom: space.s8, paddingHorizontal: space.s8 },
  health: { marginTop: space.s24 },
  healthHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  healthTitle: { flex: 1 },
  healthBody: { marginTop: space.s8 },
  healthActions: { flexDirection: 'row', alignItems: 'center', gap: space.s24, marginTop: space.s16 },
  skeletonSlat: { marginTop: space.s20 },
  skeletonLine: { marginTop: space.s12 },
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
});
