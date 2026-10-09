import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { LatLng, projectRoutes } from '../state/routes';

/**
 * A route drawn as a line on paper, with no map under it: the small version in
 * the feed, and the whole map where there's no map view (web). Several routes
 * draw faintly on top of each other, so paths walked often come out darker.
 */
export function RouteThumb({
  routes,
  width,
  height,
  style,
}: {
  routes: LatLng[][];
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const paths = useMemo(() => projectRoutes(routes, width, height), [routes, width, height]);
  const single = routes.length === 1;
  // One route gets a hollow start and a solid finish, read back from its path data.
  const ends = useMemo(() => {
    const nums = single ? paths[0]?.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [] : [];
    if (nums.length < 4) return null;
    return { start: [nums[0], nums[1]], end: [nums[nums.length - 2], nums[nums.length - 1]] };
  }, [paths, single]);

  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={colors.ink}
            strokeOpacity={single ? 1 : routes.length > 40 ? 0.14 : 0.24}
            strokeWidth={single ? 3.5 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {ends ? (
          <>
            <Circle cx={ends.start[0]} cy={ends.start[1]} r={5} fill={colors.white} stroke={colors.ink} strokeWidth={3} />
            <Circle cx={ends.end[0]} cy={ends.end[1]} r={4} fill={colors.ink} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.track, overflow: 'hidden' },
});
