import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft, ShareIcon } from '../components/Icons';
import { PhotoSlot } from '../components/PhotoSlot';
import { PrimaryButton } from '../components/PrimaryButton';
import { members, milestone } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

export function MilestoneScreen({ navigation }: RootStackScreenProps<'Milestone'>) {
  const insets = useSafeAreaInsets();
  const cheerers = milestone.cheeredBy.map((id) => members[id]);

  return (
    <View style={styles.root}>
      <View style={styles.photo}>
        <PhotoSlot
          uri={milestone.photoUri}
          placeholderLabel="Milestone photo — drop a run photo"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(22,15,8,0.42)', 'rgba(22,15,8,0)', 'rgba(22,15,8,0.06)', 'rgba(22,15,8,0.84)']}
          locations={[0, 0.26, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.back, { top: insets.top + 8 }]}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ChevronLeft size={20} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <View style={styles.caption}>
          <View style={styles.dayPill}>
            <Text style={styles.dayPillText}>Day {milestone.day}</Text>
          </View>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.subtitle}>{milestone.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 22 }]}>
        <Text style={styles.motto}>{milestone.motto}</Text>
        <Text style={styles.dateLine}>{milestone.dateLine}</Text>
        <View style={styles.cheered}>
          <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
          <Text style={styles.cheeredText}>Cheered on by Darcey and Whit</Text>
        </View>
        <View style={styles.actions}>
          <PrimaryButton title="Send a cheer" onPress={() => {}} style={{ flex: 1 }} />
          <Pressable style={styles.shareBtn} accessibilityLabel="Share">
            <ShareIcon size={20} color={colors.inkSoft} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  photo: { flex: 1, overflow: 'hidden' },
  back: {
    position: 'absolute',
    left: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { position: 'absolute', left: 22, right: 22, bottom: 22 },
  dayPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  dayPillText: { color: '#fff', fontSize: 12, fontWeight: weights.semibold },
  title: { ...type.display, color: '#fff' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.92)', marginTop: 11 },
  panel: { paddingHorizontal: 22, paddingTop: 19, backgroundColor: colors.screen },
  motto: { fontSize: 15.5, fontWeight: weights.semibold, color: colors.ink },
  dateLine: { fontSize: 13, color: colors.faint, marginTop: 3 },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  cheeredText: { fontSize: 12.5, color: colors.muted, flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18, alignItems: 'center' },
  shareBtn: {
    width: 54,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#ECE3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
