import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Backdrop } from './Backdrop';
import { Icon } from './Icon';
import { Settle } from './Settle';
import { BackButton } from './StepScreen';

/**
 * Settings and its sub-screens, Invite and Edit profile: birch and the wall, a
 * top bar with the back mark (or a close mark on a modal), a Fraunces title,
 * an optional lead line, and the content in steam cards. No navigation header.
 *
 * One `settle` arrival: the heading, then the content, then the footer.
 */
type Props = {
  title: string;
  lead?: string;
  onBack: () => void;
  /** A modal (Invite, Edit profile) closes with the close mark instead of going back. */
  modal?: boolean;
  /** Pinned under the scroll: the screen's one solid button. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function SubScreen({ title, lead, onBack, modal, footer, children }: Props) {
  const insets = useSafeAreaInsets();
  // A modal sheet starts below the status bar already.
  const top = modal && Platform.OS === 'ios' ? space.s8 : insets.top;
  // At the largest Dynamic Type sizes the footer scrolls with the content instead of covering it.
  const { fontScale } = useWindowDimensions();
  const inline = fontScale >= 1.35;
  const actions = footer ? (
    <Settle index={2} style={[styles.footer, { paddingBottom: insets.bottom + space.s16 }, inline && styles.footerInline]}>
      {footer}
    </Settle>
  ) : null;
  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Backdrop seed={11} />
      <View style={styles.topBar}>
        {modal ? <CloseButton onPress={onBack} /> : <BackButton onPress={onBack} />}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: footer && !inline ? space.s24 : insets.bottom + space.s40 }]}
      >
        <Settle index={0} style={styles.heading}>
          <Text style={type.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
            {title}
          </Text>
          {lead ? <Text style={[type.body, styles.lead]}>{lead}</Text> : null}
        </Settle>
        <Settle index={1}>{children}</Settle>
        {inline ? actions : null}
      </ScrollView>
      {inline ? null : actions}
    </KeyboardAvoidingView>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={space.s8} accessibilityRole="button" accessibilityLabel="Close" style={styles.side}>
      {({ pressed }) => <Icon name="close" size={24} color={pressed ? palette.stone : palette.char} />}
    </Pressable>
  );
}

/** A small caps label over a group of rows ("REMINDERS"). */
export function GroupLabel({ children, first }: { children: string; first?: boolean }) {
  return (
    <Text style={[type.caption, styles.label, first && styles.labelFirst]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A quiet line under a group: what a setting does, or a limit. */
export function GroupNote({ children, tone = 'stone' }: { children: string; tone?: 'stone' | 'coal' }) {
  return <Text style={[type.label, styles.note, tone === 'coal' && styles.noteCoal]}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s8, minHeight: layout.touch },
  side: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: layout.gutter, paddingTop: space.s8 },
  heading: { paddingHorizontal: space.s8, marginBottom: space.s24 },
  lead: { color: palette.smoke, marginTop: space.s12 },
  footer: { paddingHorizontal: layout.gutter, paddingTop: space.s12 },
  footerInline: { paddingHorizontal: 0, paddingTop: space.s32 },
  label: { marginTop: space.s32, marginBottom: space.s8, marginHorizontal: space.s8 },
  labelFirst: { marginTop: 0 },
  note: { marginTop: space.s8, marginHorizontal: space.s8 },
  noteCoal: { color: palette.coal },
});
