import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useView } from '../state/AppState';
import { alpha, palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Avatar } from '../components/Avatar';
import { Sheet, SheetHandle } from '../components/Sheet';

/**
 * A past week, from Week's list: who went and on which days. Someone else's
 * miss only ever reads "Not kept"; only you are told your freeze covered it.
 */
export function PastWeekScreen({ navigation, route }: RootStackScreenProps<'PastWeek'>) {
  const view = useView();
  const sheet = useRef<SheetHandle>(null);
  const week = view.week.past.find((p) => p.weekStart === route.params.weekStart);

  return (
    <Sheet ref={sheet} onClosed={() => navigation.goBack()} accessibilityLabel={week ? week.title : 'Past week'}>
      {week ? (
        <>
          <Text style={type.caption}>{week.outcome}</Text>
          <Text style={[type.title, styles.title]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
            {week.title}
          </Text>
          <View style={styles.list}>
            {week.members.map((m, i) => (
              <View key={m.member.id} style={[styles.row, i > 0 && styles.rule]} accessible accessibilityLabel={`${m.member.isMe ? 'You' : m.member.name}, ${m.status}${m.daysLabel ? `, ${m.daysLabel}` : ''}`}>
                <Avatar name={m.member.name} color={m.member.color} photoUri={typeof m.member.photoUri === 'string' ? m.member.photoUri : null} size={38} />
                <View style={styles.text}>
                  <Text style={type.bodyStrong}>{m.member.isMe ? 'You' : m.member.name}</Text>
                  <Text style={type.label}>{m.daysLabel || 'No sessions that week'}</Text>
                </View>
                <Text style={[type.bodySmall, m.status === 'Kept' ? styles.kept : styles.status]}>{m.status}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={[type.body, styles.title]}>This week isn’t in the last 12 anymore.</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s4, paddingRight: space.s40 },
  list: { marginTop: space.s16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha.hairline },
  text: { flex: 1 },
  status: { color: palette.smoke },
  kept: { color: palette.moss, fontWeight: '600' },
});
