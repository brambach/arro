import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { colors } from '../theme/tokens';

/** iOS-style switch. Local optimistic state — this is a static prototype. */
export function Toggle({ value = false }: { value?: boolean }) {
  const [on, setOn] = useState(value);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: on ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [on, anim]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={() => setOn((v) => !v)}
      hitSlop={8}
    >
      <Animated.View
        style={{
          width: 46,
          height: 27,
          borderRadius: 999,
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['#E7DBC9', colors.primary],
          }),
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.white,
            marginHorizontal: 2.5,
            transform: [
              { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 19] }) },
            ],
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
