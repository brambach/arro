import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { layout, palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Arrive } from '../components/Arrive';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { NoticeToast } from '../components/NoticeToast';
import { Screen } from '../components/Screen';
import { SessionCard } from '../components/SessionCard';
import { CardSkeleton } from '../components/Skeleton';
import { StatusNote } from '../components/StatusNote';
import { TextAction } from '../components/TextAction';

/**
 * The feed (spec, section 3): this week's and last week's sessions, newest
 * first, one card per session (a shared one is one card). Cheers and comments
 * are optimistic and roll back quietly (NoticeToast).
 */
export function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  const view = useView();
  const { refresh, cheer, uncheer } = useApp();
  const open = (id: string, reply = false) => navigation.navigate('SessionDetail', { sessionId: id, reply });

  return (
    <View style={styles.root}>
      <Screen onRefresh={refresh} contentStyle={styles.content}>
        <Arrive index={0}>
          <Text style={[type.title, styles.title]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
            Feed
          </Text>
        </Arrive>
        {view.offline && view.status === 'ready' ? (
          <View style={styles.note}>
            <StatusNote icon="pause" text="You’re offline. Cheers and comments wait until you’re back." />
          </View>
        ) : null}

        {view.status === 'loading' ? (
          <View style={styles.list} accessible accessibilityLabel="Loading the feed">
            <Text style={[type.caption, styles.label]}>This week</Text>
            <View style={styles.cards}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          </View>
        ) : view.status === 'error' ? (
          <Card style={styles.list}>
            <Text style={type.heading}>Couldn’t load the feed</Text>
            <Text style={[type.bodySmall, styles.gap8]}>Check your connection and try again.</Text>
            <TextAction label="Try again" onPress={() => void refresh()} tone="coal" size="bodySmall" style={styles.retry} />
          </Card>
        ) : view.feed.empty ? (
          <Arrive index={1}>
            <Card style={styles.list}>
              <Icon name="feed" size={28} color={palette.pebble} />
              <Text style={[type.heading, styles.gap8]}>Quiet so far</Text>
              <Text style={[type.bodySmall, styles.gap8]}>
                Sessions from this week and last show here, yours and everyone’s. Log one and it’s the first.
              </Text>
              <TextAction label="Log a session" onPress={() => navigation.navigate('LogSession')} tone="coal" size="bodySmall" style={styles.retry} />
            </Card>
          </Arrive>
        ) : (
          view.feed.sections.map((section, s) => (
            <Arrive key={section.key} index={s + 1}>
              <Text style={[type.caption, styles.label]} accessibilityRole="header">
                {section.title}
              </Text>
              <View style={styles.cards}>
                {section.cards.map((c) => (
                  <SessionCard
                    key={c.id}
                    card={c}
                    onOpen={() => open(c.id)}
                    onReply={() => open(c.id, true)}
                    onCheer={() => void cheer(c.id)}
                    onUncheer={() => void uncheer(c.id)}
                  />
                ))}
              </View>
            </Arrive>
          ))
        )}
      </Screen>
      <NoticeToast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space.s40 },
  title: { paddingHorizontal: space.s8, paddingTop: space.s12 },
  note: { paddingHorizontal: space.s8, marginTop: space.s12 },
  list: { marginTop: space.s20 },
  label: { marginTop: space.s24, marginBottom: space.s8, paddingHorizontal: space.s8 },
  cards: { gap: space.s12 },
  gap8: { marginTop: space.s8 },
  retry: { alignSelf: 'flex-start', marginTop: space.s12 },
});
