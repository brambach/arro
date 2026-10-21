import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Card } from './Card';
import { Field } from './Field';

/**
 * The invite, shared by onboarding's Invite step and the Invite screen: the
 * family's join code large in Fraunces on a steam card, the join link under
 * it, the optional "Who's it for?" name, and, where there's no share sheet
 * (the web preview), the message to send by hand.
 */
type Props = {
  code: string;
  link: string;
  name: string;
  onName: (name: string) => void;
  fallback: string | null;
};

export function InvitePanel({ code, link, name, onName, fallback }: Props) {
  return (
    <View>
      <Card padding={24} style={styles.codeCard}>
        <Text style={type.caption}>Your family’s code</Text>
        <Text
          style={[type.title, styles.code]}
          selectable
          maxFontSizeMultiplier={maxFontScale.title}
          accessibilityLabel={`Join code ${code.split('').join(' ')}`}
        >
          {code}
        </Text>
        <Text style={[type.bodySmall, styles.link]} selectable>
          {link.replace('https://', '')}
        </Text>
        <Text style={[type.label, styles.note]}>
          It goes in the message with a link. They tap “I have an invite” in Saunafam and type the code in. Codes last 14 days.
        </Text>
      </Card>
      <Field
        label="Who’s it for? (optional)"
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        maxLength={24}
        placeholder="Maya"
        hint="They’ll show as invited until they join."
        wrapStyle={styles.field}
      />
      {fallback ? (
        <Card padding={20} background={palette.aspen} style={styles.fallback}>
          <Text style={[type.labelStrong, styles.onAspen]}>There’s no share sheet here. Send this yourself:</Text>
          <Text style={[type.bodySmall, styles.fallbackText]} selectable>
            {fallback}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  code: { letterSpacing: 4, marginTop: space.s12, textAlign: 'center' },
  link: { marginTop: space.s4, textAlign: 'center' },
  note: { marginTop: space.s16, textAlign: 'center' },
  field: { marginTop: space.s24 },
  fallback: { marginTop: space.s16 },
  onAspen: { color: palette.smoke },
  fallbackText: { marginTop: space.s8, color: palette.smoke },
});
