import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '../theme/tokens';
import { regionFor } from '../state/routes';
import type { RouteMapProps } from './RouteMap';

/**
 * Routes on Apple Maps, in its muted style so the line is what stands out. One
 * route gets a hollow start and a solid finish. Many routes draw faintly on top
 * of each other, so paths walked often come out darker.
 */
export function RouteMap({ routes, interactive = false, style }: RouteMapProps) {
  const region = useMemo(() => regionFor(routes), [routes]);
  if (!region) return null;
  const single = routes.length === 1;
  const route = routes[0];
  const faint = routes.length > 40 ? 'rgba(43,39,34,0.22)' : 'rgba(43,39,34,0.34)';

  return (
    <View style={style} pointerEvents={interactive ? 'auto' : 'none'}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="mutedStandard"
        userInterfaceStyle="light"
        showsPointsOfInterests={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {routes.map((r, i) => (
          <Polyline
            key={i}
            coordinates={r}
            strokeColor={single ? colors.ink : faint}
            strokeWidth={single ? 4 : 3}
            lineCap="round"
            lineJoin="round"
          />
        ))}
        {single && route.length > 1 ? (
          <>
            <Marker coordinate={route[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.start} />
            </Marker>
            <Marker coordinate={route[route.length - 1]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.end} />
            </Marker>
          </>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  start: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink },
  end: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.ink },
});
