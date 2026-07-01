import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { FadeInView } from '../components/FadeInView';
import { ShareIcon } from '../components/Icons';
import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { WeeklyRecapCard } from '../components/WeeklyRecapCard';
import { familyList, week } from '../data/family';
import { MainTabScreenProps } from '../navigation/types';

export function TrailScreen(_props: MainTabScreenProps<'Trail'>) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#FFEAD1', colors.cream]} locations={[0, 0.34]} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 12,
          paddingHorizontal: 22,
        }}
      >
        <FadeInView delay={40} style={styles.header}>
          <Text style={styles.title}>Your week</Text>
          <Pressable style={styles.shareBtn} hitSlop={8}>
            <ShareIcon size={17} color="#8B7867" />
          </Pressable>
        </FadeInView>

        <FadeInView delay={140} style={styles.cardWrap}>
          <WeeklyRecapCard
            range={week.range}
            headline={week.headline}
            days={week.days}
            keptDays={week.keptDays}
            totalDays={week.totalDays}
            runsTogether={week.runsTogether}
            quote={week.quote}
            members={familyList}
          />
        </FadeInView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E7D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: { marginTop: 22 },
});
