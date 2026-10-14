import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { streakRules } from '../data/streakRules';
import { Card } from './Card';

/** The streak and freeze rules, one card. `brief` (onboarding) keeps the essential ones; Settings > Streak rules shows all. */
export function StreakRulesList({ brief = false }: { brief?: boolean }) {
  const rules = brief ? streakRules.filter((r) => 'essential' in r && r.essential) : streakRules;
  return (
    <Card padding={0} style={{ paddingHorizontal: 18 }}>
      {rules.map((rule, i) => (
        <View key={rule.title} style={[styles.row, i < rules.length - 1 && styles.rowBorder]}>
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
  title: { fontSize: 17, fontWeight: weights.semibold, color: colors.ink },
  body: { fontSize: 15.5, lineHeight: 21, color: colors.muted, marginTop: 3 },
});
