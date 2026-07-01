import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { FadeInView } from '../components/FadeInView';
import { RunCard } from '../components/RunCard';
import { Screen } from '../components/Screen';
import { feed } from '../data/family';
import { MainTabScreenProps } from '../navigation/types';

export function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  return (
    <Screen>
      <FadeInView delay={40} style={styles.header}>
        <Text style={type.title}>Family activity</Text>
        <Text style={styles.subtitle}>Just the five of you, one run at a time</Text>
      </FadeInView>

      <View style={styles.list}>
        {feed.map((item, i) => (
          <FadeInView key={item.id} delay={120 + i * 60}>
            <RunCard
              item={item}
              // The freshest, highlighted run opens its milestone card.
              onPress={item.keptBadge ? () => navigation.navigate('Milestone') : undefined}
            />
          </FadeInView>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.section, paddingTop: 8, paddingBottom: 4 },
  subtitle: { fontFamily: fonts.sansBody, fontSize: 13, color: colors.muted, marginTop: 2 },
  list: { paddingHorizontal: spacing.screen, marginTop: 10, gap: 12 },
});
