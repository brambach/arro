import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { LatLng } from '../state/routes';
import { RouteThumb } from './RouteThumb';

export type RouteMapProps = {
  routes: LatLng[][];
  /** Pan and zoom. Off for the map at the top of a workout, which scrolls with the page. */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Web (and anywhere without a native map): the route drawn on paper.
 * RouteMap.native.tsx draws it on Apple Maps.
 */
export function RouteMap({ routes, style }: RouteMapProps) {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  return (
    <View style={style} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size ? <RouteThumb routes={routes} width={size.w} height={size.h} style={{ flex: 1 }} /> : null}
    </View>
  );
}
