import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceRow } from '../components/ChoiceRow';
import { ChevronLeft, PulseIcon, TargetIcon } from '../components/Icons';
import { MoveMethod } from '../data/types';
import { useApp } from '../state/AppState';
import { healthAvailable } from '../state/health';
import { RootStackScreenProps } from '../navigation/types';

/** Settings > How you move: the onboarding choice, changeable. Picking Apple Health asks for access straight away. */
export function MoveMethodScreen({ navigation }: RootStackScreenProps<'MoveMethod'>) {
  const insets = useSafeAreaInsets();
  const { session, setMoveMethod } = useApp();
  const [busy, setBusy] = useState(false);
  const canUseHealth = healthAvailable();
  const current = session?.me.moveMethod ?? 'manual';

  const choose = async (method: MoveMethod) => {
    if (busy || method === current) return;
    setBusy(true);
    try {
      await setMoveMethod(method);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: insets.bottom + 24 }}>
        <Text style={type.title}>How you move</Text>
        <Text style={styles.sub}>How your days count toward the family streak.</Text>
        <View style={{ marginTop: 18 }}>
          <ChoiceRow
            title="I moved today"
            body="Tap once when you’ve moved. A walk, the gym, yoga, anything."
            icon={<TargetIcon />}
            selected={current === 'manual'}
            onPress={() => choose('manual')}
          />
          <ChoiceRow
            title="Apple Health"
            body="Counts your workouts for you, no tapping."
            icon={<PulseIcon />}
            selected={current === 'health'}
            onPress={() => choose('health')}
          />
        </View>
        {busy ? (
          <Text style={styles.note}>Checking Apple Health…</Text>
        ) : current === 'health' ? (
          <Text style={styles.note}>
            {canUseHealth
              ? 'Arro only reads your workouts and their routes, nothing else. Routes leave off the start and end. Workouts from today and yesterday count on their own. If none show up, allow Arro in the iPhone’s Settings under Health > Data Access & Devices.'
              : 'Apple Health isn’t available here. “I moved today” is always there instead.'}
          </Text>
        ) : (
          <Text style={styles.note}>“I moved today” is always there, whichever you pick.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { paddingHorizontal: 16, paddingVertical: 6 },
  sub: { ...type.body, marginTop: 6 },
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 2 },
});
