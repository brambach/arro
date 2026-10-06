import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { InvitePanel } from '../components/InvitePanel';
import { PrimaryButton } from '../components/PrimaryButton';
import { useSendInvite } from '../state/useSendInvite';
import { RootStackScreenProps } from '../navigation/types';

/** Invite from inside the app: the "+" and "Invite a family member" on Family members, and Today's invite links. */
export function InviteScreen({ navigation }: RootStackScreenProps<'Invite'>) {
  const insets = useSafeAreaInsets();
  const invite = useSendInvite();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Close">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={type.title}>Invite a family member</Text>
        <Text style={styles.sub}>Send the message, or read them the code. It takes them about a minute to join.</Text>
        <View style={{ marginTop: 20 }}>
          <InvitePanel code={invite.code} name={invite.name} onName={invite.setName} fallback={invite.fallback} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton
          title={invite.fallback ? 'Done' : 'Send invite'}
          onPress={async () => {
            if (invite.fallback) {
              await invite.commit();
              navigation.goBack();
            } else if (await invite.send()) {
              navigation.goBack();
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { height: 40, paddingHorizontal: spacing.gutter, justifyContent: 'center' },
  close: { fontSize: 16, color: colors.muted, fontWeight: weights.medium },
  body: { paddingHorizontal: spacing.gutter, paddingTop: 14, paddingBottom: 24 },
  sub: { ...type.body, marginTop: 6 },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: 10 },
});
