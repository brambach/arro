import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';

/**
 * Photo area used by milestone / trail cards. Renders the image when a uri is
 * present; otherwise a warm sunrise-toned placeholder so the layout reads as a
 * real photo card (never a broken image). Drop real uris in later.
 */
type Props = {
  uri?: string | null;
  placeholderLabel?: string;
  gradient?: readonly [string, string, ...string[]];
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PhotoSlot({
  uri,
  placeholderLabel,
  gradient = ['#FFD7A6', '#F2A15C', '#D9793B'],
  children,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          {placeholderLabel && (
            <View style={styles.labelWrap}>
              <Text style={styles.label}>{placeholderLabel}</Text>
            </View>
          )}
        </LinearGradient>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.warmFill },
  labelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  label: {
    fontFamily: fonts.sansLabel,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
});
