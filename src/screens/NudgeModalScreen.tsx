import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadows } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { PrimaryButton } from '../components/PrimaryButton';
import { useApp, useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export function NudgeModalScreen({ navigation, route }: RootStackScreenProps<'Nudge'>) {
  const view = useView();
  const { nudge } = useApp();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const member = (route.params?.memberId && view.members[route.params.memberId]) || view.nudgeTarget;
  const close = () => navigation.goBack();
  if (!member || member.invited) return null;

  // One nudge per person per day, whoever sends it, so "already" reads as sent too.
  const send = () => {
    setState('sending');
    nudge(member.id)
      .then(() => {
        setState('sent');
        setTimeout(close, 700);
      })
      .catch(() => setState('failed'));
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
      <View style={styles.card}>
        <AvatarRing member={member} size={70} />
        <Text style={styles.title}>{member.name} still has today.</Text>
        <Text style={styles.sub}>It’s still today for them.</Text>
        <View style={styles.divider} />
        <Text style={styles.prompt}>A little nudge?</Text>
        <Text style={styles.promptSub}>It’s never too late.</Text>
        <PrimaryButton
          title={state === 'sent' ? 'Sent' : state === 'sending' ? 'Sending…' : 'Send a cheer'}
          onPress={send}
          disabled={state === 'sending' || state === 'sent'}
          style={styles.cta}
        />
        {state === 'failed' ? <Text style={styles.failed}>Couldn’t send it. Try again.</Text> : null}
        <Pressable onPress={close} style={styles.notNow} hitSlop={6}>
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(28,20,12,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    width: '100%',
    backgroundColor: colors.screen,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
    // A sheet over a dimmed screen: the highest surface in the app.
    ...shadows.float,
  },
  title: { ...type.greeting, textAlign: 'center', marginTop: 16 },
  sub: { ...type.body, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.divider, alignSelf: 'stretch', marginVertical: 20 },
  prompt: { ...type.name },
  promptSub: { ...type.meta, marginTop: 4 },
  cta: { alignSelf: 'stretch', marginTop: 20 },
  failed: { ...type.meta, color: colors.muted, marginTop: 10 },
  notNow: { paddingVertical: 13, marginTop: 2 },
  notNowText: { fontSize: 15, fontWeight: weights.semibold, color: colors.muted },
});
