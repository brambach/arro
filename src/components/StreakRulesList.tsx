import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { streakRules } from '../data/streakRules';
import { Card } from './Card';

/** The streak and freeze rules, one card. Used in onboarding and in Settings > Streak rules. */
export function StreakRulesList() {
  return (
    <Card padding={0} style={{ paddingHorizontal: 18 }}>
      {streakRules.map((rule, i) => (
        <View key={rule.title} style={[styles.row, i < streakRules.length - 1 && styles.rowBorder]}>
          <Text style={styles.title}>{rule.title}</Text>
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dividerSoft },
  title: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
});
