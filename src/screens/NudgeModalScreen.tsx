import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { PrimaryButton } from '../components/PrimaryButton';
import { useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export function NudgeModalScreen({ navigation, route }: RootStackScreenProps<'Nudge'>) {
  const view = useView();
  const member = (route.params?.memberId && view.members[route.params.memberId]) || view.nudgeTarget;
  const close = () => navigation.goBack();
  if (!member || member.invited) return null;

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
        <PrimaryButton title="Send a cheer" onPress={close} style={styles.cta} />
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
    // The only lifted surface in the app: a sheet over a dimmed screen, softly.
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  title: { ...type.greeting, textAlign: 'center', marginTop: 16 },
  sub: { ...type.body, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.divider, alignSelf: 'stretch', marginVertical: 20 },
  prompt: { ...type.name },
  promptSub: { ...type.meta, marginTop: 4 },
  cta: { alignSelf: 'stretch', marginTop: 20 },
  notNow: { paddingVertical: 13, marginTop: 2 },
  notNowText: { fontSize: 15, fontWeight: weights.semibold, color: colors.muted },
});
