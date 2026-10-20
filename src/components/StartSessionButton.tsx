import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { palette } from '../theme/tokens';
import { Icon } from './Icon';
import { SolidButton } from './SolidButton';

/**
 * Placeholder from M9 until M8 brings its own: the 64 pt ember "Start a
 * session" on Today, which opens the timer. M8 owns this file and replaces it
 * with the door-closing morph; the coordinator takes M8's version at merge.
 */
export function StartSessionButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const navigation = useNavigation();
  return (
    <SolidButton
      title="Start a session"
      size="large"
      icon={<Icon name="today" size={22} color={palette.steam} />}
      accessibilityHint="Opens the timer"
      // The Timer route is M8's; it isn't in RootStackParamList on this branch yet.
      onPress={() => (navigation.navigate as (name: string) => void)('Timer')}
      style={style}
    />
  );
}
