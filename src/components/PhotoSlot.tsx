import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { PhotoSource } from '../data/types';

/**
 * Photo area (milestone). Renders the image when a uri is set; otherwise a
 * flat neutral placeholder — never a broken image. Drop real uris in later.
 */
type Props = {
  uri?: PhotoSource;
  placeholderLabel?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PhotoSlot({ uri, placeholderLabel, children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {uri ? (
        <Image source={typeof uri === 'string' ? { uri } : uri} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          {placeholderLabel ? <Text style={styles.label}>{placeholderLabel}</Text> : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#C7BCAE' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#C7BCAE' },
  label: { fontSize: 12.5, fontWeight: weights.medium, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
