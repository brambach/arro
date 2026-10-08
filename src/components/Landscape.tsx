import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';
import { motion, useReduceMotion } from '../theme/motion';

/**
 * The hills from arrofamily.com, at dawn (Welcome) or dusk (milestones). Four
 * layers, sky to near, baked from site/scenes. On arrival the hills settle
 * into place nearest-last, the further ones moving less, once (each hill layer
 * is transparent above its ridge, so rising from below never opens a gap). The
 * sky fades up out of the paper so the scene has no top edge.
 */
const SCENES = {
  dawn: [
    require('../../assets/scenes/dawn-sky.webp'),
    require('../../assets/scenes/dawn-far.webp'),
    require('../../assets/scenes/dawn-mid.webp'),
    require('../../assets/scenes/dawn-near.webp'),
  ],
  dusk: [
    require('../../assets/scenes/dusk-sky.webp'),
    require('../../assets/scenes/dusk-far.webp'),
    require('../../assets/scenes/dusk-mid.webp'),
    require('../../assets/scenes/dusk-near.webp'),
  ],
} as const;

/** How far each layer travels on arrival, sky to near. */
const DEPTH = [0, 14, 26, 40];

type Props = {
  time: 'dawn' | 'dusk';
  height: number;
  /** The colour above the scene, for the sky's fade. */
  fadeFrom?: string;
  /** Mist the near hill back into the paper, for a scene with content below it. */
  fadeBottom?: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function Landscape({ time, height, fadeFrom = colors.screen, fadeBottom = false, delay = 0, style }: Props) {
  const reduceMotion = useReduceMotion();
  const layers = useRef(DEPTH.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      layers.forEach((l) => l.setValue(1));
      return;
    }
    const anim = Animated.stagger(
      90,
      layers.map((l) => Animated.timing(l, { toValue: 1, ...motion.statement, delay, useNativeDriver: true })),
    );
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, layers, delay]);

  return (
    <View style={[{ height, overflow: 'hidden' }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {SCENES[time].map((src, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: i === 0 ? layers[i] : 1,
              transform: [{ translateY: layers[i].interpolate({ inputRange: [0, 1], outputRange: [DEPTH[i], 0] }) }],
            },
          ]}
        >
          <Image source={src} style={[styles.layer, { height }]} resizeMode="cover" />
        </Animated.View>
      ))}
      <LinearGradient
        colors={[fadeFrom, `${fadeFrom}00`]}
        locations={[0, 0.5]}
        style={StyleSheet.absoluteFill}
      />
      {fadeBottom ? (
        <LinearGradient colors={[`${fadeFrom}00`, fadeFrom]} locations={[0.86, 1]} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, width: '100%' },
});
