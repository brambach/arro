import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette, radii } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../state/AppState';
import { SolidButton } from './SolidButton';
import { Icon } from './Icon';
import { onDevCommand } from '../dev/capture';

/**
 * Today's big ember "Start a session" (64 pt). Tapping it starts the timer and
 * the button itself grows into the dark room: it measures its frame and hands
 * it to the Timer screen, which morphs a door from that frame to the screen
 * (moments.doorCloses). The medium haptic fires when the door lands, in the
 * Timer screen.
 *
 * One timer at a time: with one running, the button reads "Back to the timer"
 * and reopens it the same way.
 *
 *   <StartSessionButton />
 *   <StartSessionButton onStart={() => analytics('start')} />
 *
 * `onStart` runs after the timer starts (or reopens), before the room opens.
 */
type Props = {
  onStart?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function StartSessionButton({ onStart, style }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { view, startTimer } = useApp();
  const frame = useRef<View>(null);
  const running = !!view?.timer;

  const open = () => {
    const go = (x: number, y: number, width: number, height: number) => {
      // Starting again while one is running just reopens it (AppState.startTimer).
      if (!running) startTimer().catch(() => undefined);
      onStart?.();
      navigation.navigate('Timer', {
        origin: width > 0 ? { x, y, width, height, radius: radii.button, tone: 'ember' } : undefined,
        started: !running,
      });
    };
    if (frame.current) frame.current.measureInWindow(go);
    else go(0, 0, 0, 0);
  };

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  // Dev captures: com.arrofamily.arro://dev/start presses it.
  useEffect(() => onDevCommand((cmd) => cmd === 'start' && openRef.current()), []);

  return (
    <View ref={frame} collapsable={false} style={style}>
      <SolidButton
        size="large"
        title={running ? 'Back to the timer' : 'Start a session'}
        accessibilityHint={running ? 'Opens the timer that’s running' : 'Starts the sauna timer'}
        icon={<Icon name="timer" size={22} color={palette.steam} />}
        onPress={open}
      />
    </View>
  );
}
