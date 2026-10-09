import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type } from '../theme/typography';
import { Chip } from '../components/Chip';
import { FadeInView } from '../components/FadeInView';
import { ChevronLeft } from '../components/Icons';
import { RouteMap } from '../components/RouteMap';
import { MapRange, MemberRoutes, useApp, useView } from '../state/AppState';
import { distanceLabel } from '../data/workouts';
import { RootStackScreenProps } from '../navigation/types';

const RANGES: { key: MapRange; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

/**
 * Every route someone has recorded, drawn on one map on top of each other, so the
 * paths they take most come out darker. Routes are trimmed at both ends before
 * they're shared, so nobody's front door is on it.
 */
export function MapScreen({ navigation, route }: RootStackScreenProps<'Map'>) {
  const insets = useSafeAreaInsets();
  const view = useView();
  const { loadRoutes } = useApp();
  const memberId = route.params.memberId;
  const member = view.members[memberId];
  const mine = memberId === view.me.id;
  const [range, setRange] = useState<MapRange>('month');
  const [data, setData] = useState<MemberRoutes | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadRoutes(memberId, range)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [loadRoutes, memberId, range]);

  const title = mine ? 'Your map' : `${member?.name ?? 'Their'}’s map`;
  const loading = !data && !failed;
  const empty = data && data.routes.length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <FadeInView style={styles.chips}>
        {RANGES.map((r) => (
          <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
        ))}
      </FadeInView>

      <FadeInView delay={60} style={styles.mapWrap}>
        {data && data.routes.length > 0 ? (
          <RouteMap key={`${range}-${data.routes.length}`} routes={data.routes} interactive style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.placeholder}>
            {loading ? <ActivityIndicator color={colors.muted} /> : null}
            {failed ? <Text style={styles.placeholderText}>The map didn’t load. Check your connection and try again.</Text> : null}
            {empty ? (
              <Text style={styles.placeholderText}>
                {mine
                  ? 'No routes here yet. Walks, runs and rides recorded on an Apple Watch or iPhone show up once Apple Health is connected.'
                  : `No routes from ${member?.name ?? 'them'} here yet.`}
              </Text>
            ) : null}
          </View>
        )}
      </FadeInView>

      <FadeInView delay={120} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.stats}>
          <View>
            <Text style={styles.statValue}>{data ? data.routes.length : '–'}</Text>
            <Text style={styles.statLabel}>{data?.routes.length === 1 ? 'route' : 'routes'}</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{data ? (distanceLabel(data.meters) ?? '0 km') : '–'}</Text>
            <Text style={styles.statLabel}>covered</Text>
          </View>
        </View>
        <Text style={styles.note}>Darker lines are paths taken more often. The start and end of each route stay off the map.</Text>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: 16 },
  headerTitle: { ...type.name },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.gutter, paddingTop: 6, paddingBottom: 12 },
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing.gutter,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.track,
    ...shadows.card,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  placeholderText: { ...type.body, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: 14 },
  stats: { flexDirection: 'row', gap: 32 },
  statValue: { ...type.stat },
  statLabel: { ...type.meta, color: colors.muted, marginTop: 1 },
  note: { ...type.meta, color: colors.muted, marginTop: 12 },
});
