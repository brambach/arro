import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { ChevronLeft } from './Icons';
import { FadeInView } from './FadeInView';
import { PrimaryButton } from './PrimaryButton';
import { Backdrop } from './Backdrop';

/**
 * Shared shell for the onboarding steps: back button, step bar, title, a scrolling
 * body, and a footer with the main button and an optional quiet link.
 */
type Props = {
  title: string;
  subtitle?: string;
  /** "3 of 6": filled share of the step bar. Omit on the first screens. */
  step?: { index: number; total: number };
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
};

export function OnboardingFrame({
  title,
  subtitle,
  step,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Backdrop />
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
            <ChevronLeft />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        {step ? (
          <View style={styles.bar} accessibilityLabel={`Step ${step.index} of ${step.total}`}>
            <View style={[styles.barFill, { width: `${(step.index / step.total) * 100}%` }]} />
          </View>
        ) : null}
        <View style={styles.back} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <FadeInView>
          <Text style={[type.title, styles.title]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </FadeInView>
        <FadeInView delay={80} style={styles.content}>
          {children}
        </FadeInView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton title={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />
        {secondaryLabel ? (
          <Pressable onPress={onSecondary} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12 },
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  // A word next to the arrow, and a full 44pt target: clearer for anyone new to iPhone apps.
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44, paddingRight: 6 },
  backText: { fontSize: 17, color: colors.inkSoft },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.ink },
  body: { paddingHorizontal: 26, paddingTop: 18, paddingBottom: 20 },
  title: { fontSize: 34, lineHeight: 37 },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.muted, marginTop: 8 },
  content: { marginTop: 22 },
  footer: { paddingHorizontal: 26, paddingTop: 10 },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 6 },
  secondaryText: { fontSize: 16, fontWeight: weights.semibold, color: colors.muted },
});
