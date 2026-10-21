import React, { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { DEFAULT_RHYTHM, RulesRhythm, streakRulesFor } from '../data/streakRules';
import { Card } from './Card';

/**
 * The seven streak rules (src/data/streakRules.ts), in one steam card: a
 * Fraunces numeral in coal, the rule's short name, and the rule. Rules 2 and 3
 * follow the family's own rhythm. Shown in onboarding (How the streak works)
 * and Settings > Streak rules.
 */
export function StreakRulesList({ rhythm = DEFAULT_RHYTHM }: { rhythm?: RulesRhythm }) {
  const rules = streakRulesFor(rhythm);
  return (
    <Card padding={0}>
      <View style={styles.list}>
        {rules.map((rule, i) => (
          <Fragment key={rule.title}>
            {i > 0 ? <View style={styles.hairline} /> : null}
            <View style={styles.row} accessible accessibilityLabel={`${i + 1}. ${rule.title}. ${rule.body}`}>
              <Text style={[type.headingStrong, styles.number]} allowFontScaling={false}>
                {i + 1}
              </Text>
              <View style={styles.text}>
                <Text style={type.bodyStrong}>{rule.title}</Text>
                <Text style={type.bodySmall}>{rule.body}</Text>
              </View>
            </View>
          </Fragment>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space.s4 },
  row: { flexDirection: 'row', gap: space.s16, paddingHorizontal: space.s20, paddingVertical: space.s16 },
  number: { color: palette.coal, width: space.s20, textAlign: 'center' },
  text: { flex: 1, gap: space.s4 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline, marginLeft: space.s56 },
});
