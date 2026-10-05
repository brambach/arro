import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Card } from './Card';
import { TextField } from './TextField';

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
        <Text style={styles.codeNote}>The link in the message works too. The code is for when a link doesn’t open.</Text>
      </Card>
      <TextField
        label="Who’s it for? (optional)"
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        maxLength={24}
        placeholder="Mum"
        wrapStyle={{ marginTop: 20 }}
      />
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
  codeLabel: { fontSize: 13, color: colors.muted },
  code: { fontSize: 36, fontWeight: weights.bold, letterSpacing: 6, color: colors.ink, marginTop: 8 },
  codeNote: { fontSize: 12.5, lineHeight: 17, color: colors.faint, textAlign: 'center', marginTop: 10 },
  fallbackLabel: { fontSize: 12.5, fontWeight: weights.semibold, color: colors.muted },
  fallback: { fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 6 },
});
