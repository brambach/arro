import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Backdrop } from './Backdrop';
import { EmberDots } from './EmberDots';
import { Icon } from './Icon';
import { Settle } from './Settle';
import { SolidButton } from './SolidButton';
import { TextAction } from './TextAction';

/**
 * One onboarding step, Löyly style: birch and the wall behind, a back control,
 * the steps as small ember dots, a Fraunces title, the step's content, and the
 * main action at the bottom as a solid ember button with an optional plain-text
 * second action under it.
 *
 * The screen arrives once with `settle`: the heading, then the content, then
 * the footer, 70 ms apart.
 */
type Props = {
  title: string;
  subtitle?: string;
  /** "3 of 7". Left off on screens outside the count. */
  step?: { index: number; total: number };
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Replaces the solid button (Sign in with Apple's own button). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

export function StepScreen({
  title,
  subtitle,
  step,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  footer,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Backdrop />
      <View style={styles.topBar}>
        {onBack ? <BackButton onPress={onBack} /> : <View style={styles.side} />}
        {step ? (
          <View accessible accessibilityRole="text" accessibilityLabel={`Step ${step.index} of ${step.total}`}>
            <EmberDots count={step.total} filled={step.index} size="mini" />
          </View>
        ) : null}
        <View style={styles.side} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Settle index={0}>
          <Text style={type.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
            {title}
          </Text>
          {subtitle ? <Text style={[type.body, styles.subtitle]}>{subtitle}</Text> : null}
        </Settle>
        {children ? (
          <Settle index={1} style={styles.content}>
            {children}
          </Settle>
        ) : null}
      </ScrollView>

      <Settle index={2} style={[styles.footer, { paddingBottom: insets.bottom + space.s16 }]}>
        {footer ?? <SolidButton title={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />}
        {secondaryLabel && onSecondary ? <TextAction label={secondaryLabel} onPress={onSecondary} style={styles.secondary} /> : null}
      </Settle>
    </KeyboardAvoidingView>
  );
}

/** The top bar's back control: the `back` mark in a 44 pt target. */
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={space.s8} accessibilityRole="button" accessibilityLabel={label} style={styles.side}>
      {({ pressed }) => <Icon name="back" size={24} color={pressed ? palette.stone : palette.char} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.s8,
    minHeight: layout.touch,
  },
  side: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: layout.inset, paddingTop: space.s16, paddingBottom: space.s24 },
  subtitle: { color: palette.smoke, marginTop: space.s12 },
  content: { marginTop: space.s32 },
  footer: { paddingHorizontal: layout.inset, paddingTop: space.s12 },
  secondary: { marginTop: space.s8 },
});
