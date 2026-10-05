import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { ListIcon } from '../components/Icons';
import { TextButton } from '../components/TextButton';
import { WorkoutCard } from '../components/WorkoutCard';
import { Screen } from '../components/Screen';
import { joinNames } from '../data/workouts';
import { useApp, useView } from '../state/AppState';
import { MainTabScreenProps } from '../navigation/types';

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

export function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  const view = useView();
  const { nudge } = useApp();
  const joined = view.joinedCount;
  const count = COUNT_WORDS[joined] ?? joined;
  const subtitle =
    joined === 1
      ? view.invitedList.length
        ? `Just you so far. ${joinNames(view.invitedList.map((m) => m.name))} hasn’t joined yet.`
        : 'Just you so far.'
      : `Just the ${count} of you, one day at a time.`;
  const waiting = joined === 1;

  return (
    <Screen>
      <FadeInView style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Family feed</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <ListIcon />
      </FadeInView>

      <View style={styles.list}>
        {view.feed.map((item, i) => {
          const workoutId = item.workoutId;
          return (
            <FadeInView key={item.id} delay={60 + i * 40} style={{ marginBottom: 12 }}>
              <WorkoutCard
                item={item}
                member={view.members[item.memberId]}
                onPress={workoutId ? () => navigation.navigate('WorkoutDetail', { workoutId }) : undefined}
                onCheer={item.kind === 'still' ? () => nudge(item.memberId) : undefined}
              />
            </FadeInView>
          );
        })}

        {view.feed.length === 0 ? (
          <FadeInView delay={60}>
            <Card radius={radii.card} padding={20}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                {view.iKeptToday
                  ? 'Your family’s days will show up here.'
                  : 'When you or your family log a day, it shows up here. Tap “I moved today” on Today to be first.'}
              </Text>
            </Card>
          </FadeInView>
        ) : null}

        {waiting ? (
          <FadeInView delay={120} style={{ marginTop: view.feed.length ? 0 : 12 }}>
            <Card radius={radii.card} padding={20} background={colors.cardAlt}>
              <Text style={styles.emptyTitle}>
                {view.invitedList.length ? 'Waiting for your family' : 'It’s just you for now'}
              </Text>
              <Text style={styles.emptyBody}>
                {view.invitedList.length
                  ? 'Once they join, their days appear here, and the family streak begins.'
                  : 'Invite someone and their days will appear here. The family streak begins when the second person joins.'}
              </Text>
              <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <TextButton
                  label={view.invitedList.length ? 'Send the invite again' : 'Invite a family member'}
                  onPress={() => navigation.navigate('Invite')}
                />
              </View>
            </Card>
          </FadeInView>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: spacing.gutter,
    paddingTop: 6,
    paddingBottom: 14,
  },
  subtitle: { ...type.body, marginTop: 4 },
  list: { paddingHorizontal: spacing.gutter },
  emptyTitle: { ...type.name },
  emptyBody: { ...type.body, marginTop: 6 },
});
