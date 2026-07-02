import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radii, shadows } from '../theme/tokens';
import { weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft, Heart, MapPin } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { members, runDetail } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DASH = 340;

export function RunDetailScreen({ navigation }: RootStackScreenProps<'RunDetail'>) {
  const insets = useSafeAreaInsets();
  const offset = useRef(new Animated.Value(DASH)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => m && setReduceMotion(v))
      .catch(() => {});
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      offset.setValue(0);
      return;
    }
    // C6 route reveal: the route draws across the map (ease-in-out ~800ms).
    const anim = Animated.timing(offset, {
      toValue: 0,
      duration: 800,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, offset]);

  const cheerers = runDetail.cheeredBy.map((id) => members[id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>Run</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <View style={styles.mapWrap}>
          <View style={styles.river} />
          <Svg viewBox="0 0 320 194" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <AnimatedPath
              d={runDetail.routePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={DASH}
              strokeDashoffset={offset}
            />
            <Circle cx={runDetail.start.x} cy={runDetail.start.y} r={6.5} fill="#fff" stroke={colors.primary} strokeWidth={4} />
          </Svg>
          <View style={styles.pin}>
            <MapPin size={26} />
          </View>
          <View style={styles.mapLabel}>
            <Text style={styles.mapLabelText}>{runDetail.place}</Text>
          </View>
        </View>

        <View style={styles.headline}>
          <Text style={styles.when}>{runDetail.when}</Text>
          <Text style={styles.distance}>
            {runDetail.distance} <Text style={styles.distanceUnit}>mi</Text>
          </Text>
        </View>

        <FadeInView delay={reduceMotion ? 0 : 520} style={styles.statsWrap}>
          <View style={styles.stats}>
            <Stat value={runDetail.time} label="Time" first />
            <Stat value={`${runDetail.pace}`} unit="/mi" label="Avg pace" />
            <Stat value={runDetail.cal} label="Cal" />
          </View>
        </FadeInView>

        <FadeInView delay={reduceMotion ? 0 : 640} style={styles.noteWrap}>
          <Text style={styles.note}>{runDetail.note}</Text>
          <View style={styles.cheered}>
            <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
            <Text style={styles.cheeredText}>Darcey and Whit cheered</Text>
          </View>
        </FadeInView>
      </ScrollView>

      <View style={[styles.commentBar, { paddingBottom: insets.bottom + 15 }]}>
        <View style={styles.commentInput}>
          <Text style={styles.commentPlaceholder}>Add a comment…</Text>
        </View>
        <Pressable style={styles.sendBtn} accessibilityLabel="Send">
          <Heart size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ value, unit, label, first }: { value: string; unit?: string; label: string; first?: boolean }) {
  return (
    <View style={[styles.stat, !first && styles.statBorder]}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: 16 },
  headerTitle: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  mapWrap: {
    marginHorizontal: 20,
    marginTop: 6,
    height: 194,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6DDCE',
    backgroundColor: '#E7E1D3',
  },
  river: {
    position: 'absolute',
    left: '-12%',
    top: '34%',
    width: '130%',
    height: 52,
    backgroundColor: '#BCD4E1',
    transform: [{ rotate: '-9deg' }],
    opacity: 0.9,
  },
  pin: { position: 'absolute', left: 246, top: 34 },
  mapLabel: {
    position: 'absolute',
    left: 12,
    bottom: 11,
    backgroundColor: 'rgba(250,246,240,0.82)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  mapLabelText: { fontSize: 12, color: colors.inkSoft, fontWeight: weights.medium },
  headline: { paddingHorizontal: 22, paddingTop: 15 },
  when: { fontSize: 13, color: colors.muted },
  distance: { fontSize: 32, fontWeight: weights.bold, letterSpacing: -0.6, color: colors.ink, marginTop: 1 },
  distanceUnit: { fontSize: 18, color: colors.faint2, fontWeight: weights.semibold },
  statsWrap: { paddingHorizontal: 22, paddingTop: 16 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  stat: { flex: 1, paddingVertical: 13 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 18 },
  statValue: { fontSize: 19, fontWeight: weights.bold, letterSpacing: -0.2, color: colors.ink },
  statUnit: { fontSize: 13, color: colors.faint2, fontWeight: weights.semibold },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  noteWrap: { paddingHorizontal: 22, paddingTop: 15 },
  note: { fontSize: 14, lineHeight: 20, color: '#3A342E' },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 15 },
  cheeredText: { fontSize: 13, color: colors.muted },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    backgroundColor: colors.screen,
  },
  commentInput: { flex: 1, backgroundColor: '#EFE8DC', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 16 },
  commentPlaceholder: { fontSize: 14, color: colors.faint2 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
});
