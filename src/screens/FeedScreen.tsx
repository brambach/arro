import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { FadeInView } from '../components/FadeInView';
import { ListIcon } from '../components/Icons';
import { RunCard } from '../components/RunCard';
import { Screen } from '../components/Screen';
import { familyList, feed } from '../data/family';
import { MainTabScreenProps } from '../navigation/types';

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

export function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  const count = COUNT_WORDS[familyList.length] ?? familyList.length;
  return (
    <Screen>
      <FadeInView style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Family feed</Text>
          <Text style={styles.subtitle}>Just the {count} of you, one run at a time.</Text>
        </View>
        <ListIcon />
      </FadeInView>

      <View style={styles.list}>
        {feed.map((item, i) => (
          <FadeInView key={item.id} delay={60 + i * 40} style={{ marginBottom: 12 }}>
            <RunCard
              item={item}
              onPress={item.kind === 'kept' ? () => navigation.navigate('RunDetail') : undefined}
            />
          </FadeInView>
        ))}
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
  subtitle: { fontSize: 13, color: colors.faint, marginTop: 3 },
  list: { paddingHorizontal: spacing.gutter },
});
