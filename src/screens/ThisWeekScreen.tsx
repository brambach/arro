import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { FamilyRow } from '../state/buildView';
import { PLUS_CARD_COPY } from '../state/plus';
import { alpha, layout, palette, radii, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { timing } from '../theme/motion';
import { Arrive } from '../components/Arrive';
import { Card } from '../components/Card';
import { DayStrip } from '../components/DayStrip';
import { Icon } from '../components/Icon';
import { ListGroup, ListRow } from '../components/ListRow';
import { NoticeToast } from '../components/NoticeToast';
import { PersonRow, rowHint } from '../components/PersonRow';
import { Screen } from '../components/Screen';
import { Bone, RowsSkeleton } from '../components/Skeleton';
import { SolidButton } from '../components/SolidButton';
import { StatusNote } from '../components/StatusNote';
import { TextAction } from '../components/TextAction';
import { WallCard } from '../components/WallCard';

/**
 * Week, the streak view (spec, section 3): the wall with the family streak,
 * the longest and this year; This week's rows with your Mon to Sun strip
 * under your own; Past weeks (tap one for who went and when); Plus items and
 * the one quiet Plus card only when plus_enabled; Streak rules at the bottom.
 * The route keeps its name, ThisWeek, because the tab bar keys on it.
 */
export function ThisWeekScreen({ navigation }: MainTabScreenProps<'ThisWeek'>) {
  const view = useView();
  const { refresh, recordNagShown, dismissNag, turnOffNag } = useApp();
  const w = view.week;

  // A new showing of the quiet card counts once it's on screen.
  useEffect(() => {
    if (w.nag === 'new') recordNagShown();
  }, [w.nag, recordNagShown]);

  const tap = (r: FamilyRow) => {
    if (r.tap.kind === 'nudge') navigation.navigate('Nudge', { memberId: r.tap.memberId });
    else if (r.tap.kind === 'session') navigation.navigate('SessionDetail', { sessionId: r.tap.sessionId });
  };
  // You first, with your strip; then everyone in join order.
  const rows = [...w.rows].sort((a, b) => Number(b.member.isMe) - Number(a.member.isMe));
  const you = view.today.you;

  return (
    <View style={styles.root}>
      <Screen onRefresh={refresh} contentStyle={styles.content}>
        <Arrive index={0}>
          <Text style={[type.title, styles.title]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
            {view.familyName}
          </Text>
        </Arrive>
        {view.offline && view.status === 'ready' ? (
          <View style={styles.note}>
            <StatusNote icon="pause" text="You’re offline. This is the wall as it was last time." />
          </View>
        ) : null}

        {view.status === 'loading' ? (
          <WeekSkeleton />
        ) : view.status === 'error' ? (
          <Card style={styles.wall}>
            <Text style={type.heading}>Couldn’t load the wall</Text>
            <Text style={[type.bodySmall, styles.gap8]}>Check your connection and try again.</Text>
            <TextAction label="Try again" onPress={() => void refresh()} tone="coal" size="bodySmall" style={styles.retry} />
          </Card>
        ) : (
          <>
            <Arrive index={1} style={styles.wall}>
              <WallCard wall={w.wall} numbers={w.numbers} headline={w.headline} myDots={{ filled: you.countedDays, count: you.goal }} rollIn />
            </Arrive>

            <Arrive index={2}>
              <Text style={[type.caption, styles.label]} accessibilityRole="header">
                {w.thisWeekLabel}
              </Text>
              <Card padding={0}>
                <View style={styles.clip}>
                  {rows.map((r, i) => (
                    <React.Fragment key={r.member.id}>
                      {i > 0 ? <View style={styles.hairline} /> : null}
                      <PersonRow row={r} compact onPress={r.tap.kind === 'nudge' || r.tap.kind === 'session' ? () => tap(r) : undefined} hint={rowHint(r)} />
                      {r.member.isMe ? (
                        <View style={styles.strip}>
                          <DayStrip days={w.myStrip} />
                        </View>
                      ) : null}
                    </React.Fragment>
                  ))}
                </View>
              </Card>
            </Arrive>

            <Arrive index={3}>
              <Text style={[type.caption, styles.label]} accessibilityRole="header">
                Past weeks
              </Text>
              {w.past.length ? (
                <ListGroup>
                  {w.past.map((p) => (
                    <PastRow key={p.weekStart} title={p.title} outcome={p.outcome} onPress={() => navigation.navigate('PastWeek', { weekStart: p.weekStart })} />
                  ))}
                </ListGroup>
              ) : (
                <Card>
                  <Text style={type.bodySmall}>Your first week is on the wall. Once it closes, it shows here with everyone’s days.</Text>
                </Card>
              )}

              {w.seeEveryWeek || w.printWall ? (
                <ListGroup inset="leading" style={styles.block}>
                  {[
                    ...(w.seeEveryWeek
                      ? [
                          <ListRow
                            key="every"
                            title="See every week"
                            leading={<RowMark name="calendar" />}
                            value="Plus"
                            valueTone="quiet"
                            onPress={() => navigation.navigate('Plus', { focus: 'everyWeek' })}
                          />,
                        ]
                      : []),
                    ...(w.printWall
                      ? [
                          <ListRow
                            key="print"
                            title="Print the wall"
                            leading={<RowMark name="slat" />}
                            value="Plus"
                            valueTone="quiet"
                            onPress={() => navigation.navigate('Plus', { focus: 'poster' })}
                          />,
                        ]
                      : []),
                  ]}
                </ListGroup>
              ) : null}

              {w.nag !== 'hidden' ? (
                <Card style={styles.block}>
                  <Text style={type.bodySmall}>{PLUS_CARD_COPY.body}</Text>
                  <View style={styles.nagActions}>
                    <SolidButton title={PLUS_CARD_COPY.action} fill={false} onPress={() => navigation.navigate('Plus', { focus: 'card' })} />
                    <TextAction label={PLUS_CARD_COPY.notNow} onPress={dismissNag} size="bodySmall" />
                  </View>
                  <TextAction label={PLUS_CARD_COPY.never} onPress={turnOffNag} size="bodySmall" style={styles.never} />
                </Card>
              ) : null}

              <TextAction label="Streak rules" onPress={() => navigation.navigate('StreakRules')} size="bodySmall" style={styles.rules} />
            </Arrive>
          </>
        )}
      </Screen>
      <NoticeToast />
    </View>
  );
}

/** A past week, as the mockup sets it: the week in regular weight, the outcome quiet on the right. */
function PastRow({ title, outcome, onPress }: { title: string; outcome: string; onPress: () => void }) {
  const wash = useSharedValue(0);
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        wash.set(withTiming(1, timing.utility));
      }}
      onPressOut={() => {
        wash.set(withTiming(0, timing.utility));
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${outcome}`}
      accessibilityHint="Shows who went, and on which days"
      style={styles.past}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, washStyle]} />
      <Text style={[type.body, styles.pastTitle]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[type.bodySmall, styles.pastOutcome]} numberOfLines={2}>
        {outcome}
      </Text>
    </Pressable>
  );
}

function RowMark({ name }: { name: 'calendar' | 'slat' }) {
  return (
    <View style={styles.mark}>
      <Icon name={name} size={22} color={palette.smoke} />
    </View>
  );
}

function WeekSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading the wall">
      <Card style={styles.wall} padding={space.s24}>
        <View style={styles.skeletonWall}>
          <View style={styles.skeletonSlats}>
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} width="100%" height={21} />
            ))}
          </View>
          <View style={styles.skeletonNumbers}>
            <Bone width={56} height={64} />
            <Bone width={110} height={20} />
          </View>
        </View>
      </Card>
      <Text style={[type.caption, styles.label]}>This week</Text>
      <RowsSkeleton rows={3} rowHeight={60} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space.s40 },
  title: { paddingHorizontal: space.s8, paddingTop: space.s12 },
  note: { paddingHorizontal: space.s8, marginTop: space.s12 },
  wall: { marginTop: space.s20 },
  gap8: { marginTop: space.s8 },
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
  label: { marginTop: space.s32, marginBottom: space.s8, paddingHorizontal: space.s8 },
  clip: { borderRadius: radii.card, overflow: 'hidden', paddingVertical: space.s4 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline, marginLeft: space.s72 },
  strip: { paddingLeft: space.s72, paddingRight: space.s20, paddingBottom: space.s16, paddingTop: space.s4 },
  block: { marginTop: space.s16 },
  nagActions: { flexDirection: 'row', alignItems: 'center', gap: space.s24, marginTop: space.s16 },
  never: { alignSelf: 'flex-start', marginTop: space.s8 },
  rules: { marginTop: space.s24 },
  past: { flexDirection: 'row', alignItems: 'center', gap: space.s16, minHeight: layout.rowCompact, paddingHorizontal: space.s20, paddingVertical: space.s8 },
  wash: { backgroundColor: alpha.press },
  pastTitle: { flexShrink: 0 },
  pastOutcome: { flex: 1, textAlign: 'right', color: palette.stone },
  mark: { width: 38, height: 38, borderRadius: radii.round, backgroundColor: palette.aspen, alignItems: 'center', justifyContent: 'center' },
  skeletonWall: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s20 },
  skeletonSlats: { flex: 11, gap: space.s4 },
  skeletonNumbers: { flex: 9, gap: space.s8 },
});
