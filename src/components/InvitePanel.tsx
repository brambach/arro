import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Card } from './Card';
import { Chip } from './Chip';
import { TextField } from './TextField';

/** Quick picks for "Who's it for?", since a parent is the usual first invite. */
const WHO = ['Mom', 'Dad', 'Grandma', 'Grandpa', 'Sister', 'Brother'];

/** The join code, the optional "who is it for", and (where there's no share sheet) the message to send by hand. */
export function InvitePanel({
  code,
  name,
  onName,
  fallback,
}: {
  code: string;
  name: string;
  onName: (name: string) => void;
  fallback: string | null;
}) {
  return (
    <View>
      <Card padding={20} style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your family’s join code</Text>
        <Text style={styles.code} accessibilityLabel={`Join code ${code.split('').join(' ')}`}>
          {code}
        </Text>
        <Text style={styles.codeNote}>It goes in the message, with a link that shows them how to join.</Text>
      </Card>
      <TextField
        label="Who’s it for? (optional)"
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        maxLength={24}
        placeholder="Their name"
        wrapStyle={{ marginTop: 20 }}
      />
      <View style={styles.who}>
        {WHO.map((w) => (
          <Chip key={w} label={w} selected={name === w} onPress={() => onName(name === w ? '' : w)} />
        ))}
      </View>
      {fallback ? (
        <Card padding={14} background={colors.cardAlt} style={{ marginTop: 16 }}>
          <Text style={styles.fallbackLabel}>No share sheet here. Send this yourself:</Text>
          <Text style={styles.fallback} selectable>
            {fallback}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  codeLabel: { fontSize: 15, color: colors.muted },
  code: { fontSize: 36, fontWeight: weights.bold, letterSpacing: 6, color: colors.ink, marginTop: 8 },
  codeNote: { fontSize: 15, lineHeight: 20, color: colors.faint, textAlign: 'center', marginTop: 10 },
  who: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  fallbackLabel: { fontSize: 13.5, fontWeight: weights.semibold, color: colors.muted },
  fallback: { fontSize: 14.5, lineHeight: 20, color: colors.inkSoft, marginTop: 6 },
});
