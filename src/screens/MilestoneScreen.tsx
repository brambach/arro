import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { FadeInView } from '../components/FadeInView';
import { CloseIcon, ShareIcon } from '../components/Icons';
import { MilestoneShareCard } from '../components/MilestoneShareCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { members, milestone } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

export function MilestoneScreen({ navigation }: RootStackScreenProps<'Milestone'>) {
  const insets = useSafeAreaInsets();
  const cheerers = milestone.cheeredBy.map((id) => members[id]);

  return (
    <LinearGradient colors={['#FFE7C4', colors.cream]} locations={[0, 0.55]} style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.closeBtn}
          accessibilityLabel="Close"
        >
          <CloseIcon size={12} color="#7A5A38" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 26, paddingBottom: 12 }}
      >
        <FadeInView delay={40} style={styles.momentWrap}>
          <Text style={styles.moment}>A moment to keep</Text>
        </FadeInView>

        <FadeInView delay={140} style={styles.cardWrap}>
          <MilestoneShareCard milestone={milestone} />
        </FadeInView>

        <FadeInView delay={260} style={styles.cheeredWrap}>
          <Text style={styles.cheeredLabel}>Cheered on by your family</Text>
          <View style={styles.cheerers}>
            {cheerers.map((m) => (
              <AvatarRing key={m.id} member={m} size={44} ringWidth={2.5} badge="none" />
            ))}
          </View>
        </FadeInView>
      </ScrollView>

      {/* Footer actions */}
      <FadeInView delay={340} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          title="Send a cheer 🧡"
          height={56}
          style={{ flex: 1 }}
          onPress={() => {}}
        />
        <Pressable style={styles.shareBtn} accessibilityLabel="Share">
          <ShareIcon size={22} color={colors.primary} />
        </Pressable>
      </FadeInView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-end' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentWrap: { alignItems: 'center', marginTop: 4 },
  moment: {
    fontFamily: fonts.sansHeavy,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#C2591B',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  cardWrap: { marginTop: 20 },
  cheeredWrap: { alignItems: 'center', marginTop: 26 },
  cheeredLabel: {
    fontFamily: fonts.sansHeavy,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.faint,
  },
  cheerers: { flexDirection: 'row', gap: 10, marginTop: 12 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 26,
    paddingTop: 8,
    alignItems: 'center',
  },
  shareBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});
