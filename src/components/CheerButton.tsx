import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Heart } from './Icons';

/**
 * Cheer interaction (Motion Handoff Spec §V1·3): button Press (scale 0.96), then
 * on send ONE small heart Pulse (scale 0.6→1, opacity 1→0, once — never loops),
 * then a quiet "Cheered" state. Light haptic on send. No flying hearts.
 * Reduced Motion → keep the press, skip the pulse, jump to Cheered.
 */
type Props = {
  variant?: 'outline' | 'link';
  label?: string;
  cheeredLabel?: string;
  onCheer?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function CheerButton({
  variant = 'outline',
  label = 'Cheer',
  cheeredLabel = 'Cheered',
  onCheer,
  style,
}: Props) {
  const [cheered, setCheered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (m) reduceMotion.current = v;
      })
      .catch(() => {});
    return () => {
      m = false;
    };
  }, []);

  const cheer = () => {
    if (cheered) return;
    setCheered(true);
    onCheer?.();
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (!reduceMotion.current) {
      pulse.setValue(0);
      Animated.timing(pulse, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  };

  const outline = variant === 'outline';

  return (
    <Pressable
      onPress={cheer}
      onPressIn={() => Animated.timing(scale, { toValue: 0.96, duration: 90, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start()}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ selected: cheered }}
    >
      <Animated.View
        style={[
          outline ? styles.pill : styles.link,
          outline && cheered && styles.pillCheered,
          { transform: [{ scale }] },
        ]}
      >
        {/* One-shot pulse heart, centered over the control */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        >
          <Heart size={outline ? 16 : 15} color={colors.primary} />
        </Animated.View>

        <Text
          style={[
            outline ? styles.pillText : styles.linkText,
            cheered && { color: outline ? colors.kept : colors.muted },
          ]}
        >
          {cheered ? cheeredLabel : label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCheered: { borderColor: colors.keptBg, backgroundColor: colors.keptBg },
  pillText: { fontSize: 12.5, fontWeight: weights.semibold, color: colors.primary },
  link: { alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 13, fontWeight: weights.semibold, color: colors.inkSoft },
  pulse: { position: 'absolute', alignSelf: 'center' },
});
