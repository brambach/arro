import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { palette, space } from '../theme/tokens';
import { haptics } from '../theme/haptics';
import { maxFontScale, type } from '../theme/typography';
import { Avatar } from '../components/Avatar';
import { EmberDots } from '../components/EmberDots';
import { Sheet, SheetHandle } from '../components/Sheet';
import { SolidButton } from '../components/SolidButton';
import { TextAction } from '../components/TextAction';

/**
 * Cheering someone on who hasn't kept this week yet: a sheet with their face,
 * their dots and one button. Nudges are capped on the server (one a day from
 * anyone, and only two pushes a week reach a person); "already" reads as a
 * kind no, and any other failure as a quiet try-again. Never anything about Plus.
 */
type State = 'idle' | 'sending' | 'sent' | 'already' | 'failed';

const SENT_HOLD_MS = 1200;

export function NudgeModalScreen({ navigation, route }: RootStackScreenProps<'Nudge'>) {
  const view = useView();
  const { nudge } = useApp();
  const sheet = useRef<SheetHandle>(null);
  const [state, setState] = useState<State>('idle');
  const id = route.params?.memberId;
  const member = id ? view.members[id] : undefined;
  const row = view.today.family.find((r) => r.member.id === id);

  useEffect(() => {
    if (state !== 'sent') return;
    const t = setTimeout(() => sheet.current?.close(), SENT_HOLD_MS);
    return () => clearTimeout(t);
  }, [state]);

  const send = () => {
    if (!member) return;
    setState('sending');
    nudge(member.id)
      .then((r) => setState(r === 'sent' ? 'sent' : 'already'))
      .catch(() => {
        haptics.error();
        setState('failed');
      });
  };

  const name = member?.name ?? 'them';
  const line =
    state === 'sent'
      ? `Sent. ${name} will see it soon.`
      : state === 'already'
        ? `${name} has already had a nudge today. Try again tomorrow.`
        : state === 'failed'
          ? 'Couldn’t send it just now. Try again in a moment.'
          : row
            ? `${name}’s on ${row.status} this week. A nudge says you’re thinking of them.`
            : `A nudge says you’re thinking of ${name}.`;

  return (
    <Sheet ref={sheet} onClosed={() => navigation.goBack()} accessibilityLabel={`Cheer ${name} on`}>
      {member ? (
        <View style={styles.body}>
          <Avatar name={member.name} color={member.color} photoUri={typeof member.photoUri === 'string' ? member.photoUri : null} size={64} />
          <Text style={[type.title, styles.title]} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
            Cheer {member.name} on
          </Text>
          {row?.dots.length ? <EmberDots count={row.dots.length} filled={row.dots.filter(Boolean).length} size="small" style={styles.dots} /> : null}
          <Text style={[type.bodySmall, styles.line]} accessibilityLiveRegion="polite">
            {line}
          </Text>
          {state === 'sent' || state === 'already' ? (
            <TextAction label="Done" onPress={() => sheet.current?.close()} size="bodySmall" style={styles.done} />
          ) : (
            <>
              <SolidButton title={state === 'sending' ? 'Sending' : 'Send a nudge'} onPress={send} disabled={state === 'sending'} style={styles.button} />
              <TextAction label="Not now" onPress={() => sheet.current?.close()} size="bodySmall" style={styles.done} />
            </>
          )}
        </View>
      ) : (
        <Text style={type.body}>They’re not in the family anymore.</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center' },
  title: { marginTop: space.s16, textAlign: 'center' },
  dots: { marginTop: space.s16 },
  line: { marginTop: space.s12, textAlign: 'center', color: palette.smoke },
  button: { marginTop: space.s24 },
  done: { marginTop: space.s12 },
});
