import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { PrimaryButton } from '../components/PrimaryButton';
import { members, today } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

export function NudgeModalScreen({ navigation }: RootStackScreenProps<'Nudge'>) {
  const member = members[today.pendingId];
  const close = () => navigation.goBack();

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
      <View style={styles.card}>
        <AvatarRing member={member} size={70} style={styles.avatar} />
        <Text style={styles.title}>{member.name} still has today.</Text>
        <Text style={styles.sub}>Usually an evening run.</Text>
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
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
  },
  avatar: {
    shadowColor: '#DF6B96',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: { fontSize: 20, fontWeight: weights.bold, letterSpacing: -0.2, color: colors.ink, marginTop: 16 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#ECE4D7', alignSelf: 'stretch', marginVertical: 20 },
  prompt: { fontSize: 16, fontWeight: weights.bold, color: colors.ink },
  promptSub: { fontSize: 13, color: colors.faint, marginTop: 4 },
  cta: { alignSelf: 'stretch', marginTop: 20 },
  notNow: { paddingVertical: 13, marginTop: 2 },
  notNowText: { fontSize: 14.5, fontWeight: weights.semibold, color: colors.muted },
});
