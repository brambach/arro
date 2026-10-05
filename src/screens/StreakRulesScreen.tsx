import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChevronLeft } from '../components/Icons';
import { StreakRulesList } from '../components/StreakRulesList';
import { RootStackScreenProps } from '../navigation/types';

/** Settings > Streak rules: the same rules onboarding showed once. */
export function StreakRulesScreen({ navigation }: RootStackScreenProps<'StreakRules'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 24 }}>
        <Text style={type.title}>Streak rules</Text>
        <Text style={styles.sub}>How the family streak and freeze days work.</Text>
        <View style={{ marginTop: 18 }}>
          <StreakRulesList />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { paddingHorizontal: 16, paddingVertical: 6 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 6 },
});
