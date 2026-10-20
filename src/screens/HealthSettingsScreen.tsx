import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { ListGroup } from '../components/ListRow';
import { GroupNote, SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { ToggleRow } from '../components/ToggleRow';
import { RootStackScreenProps } from '../navigation/types';
import { HEALTH_COPY, useHealthSetting } from '../state/healthSettings';

/**
 * Settings > Apple Health (new): "Save sessions to Apple Health" and what iOS
 * says about it. Write only, mindful minutes, off until turned on. M11 wires
 * the write (src/state/healthSettings.ts, healthBridge).
 */
export function HealthSettingsScreen({ navigation }: RootStackScreenProps<'HealthSettings'>) {
  const { enabled, state, setEnabled } = useHealthSetting();
  return (
    <SubScreen title={HEALTH_COPY.title} lead={HEALTH_COPY.lead} onBack={() => navigation.goBack()}>
      <ListGroup>
        <ToggleRow
          title={HEALTH_COPY.toggle}
          value={!!enabled}
          onValueChange={setEnabled}
          disabled={enabled === null || state === 'unavailable'}
        />
      </ListGroup>
      {state ? (
        <Card padding={20} style={styles.status}>
          <Text style={type.caption}>{HEALTH_COPY.statusLabel}</Text>
          <Text style={[type.body, styles.statusText]} accessibilityLiveRegion="polite">
            {HEALTH_COPY.status[state]}
          </Text>
          {state === 'denied' ? (
            <TextAction label={HEALTH_COPY.openHealth} tone="coal" onPress={() => Linking.openURL('x-apple-health://')} style={styles.open} />
          ) : null}
        </Card>
      ) : null}
      <GroupNote>{HEALTH_COPY.what}</GroupNote>
      <Text style={[type.bodySmall, styles.old]}>{HEALTH_COPY.oldAccess}</Text>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  status: { marginTop: space.s16 },
  statusText: { marginTop: space.s8, color: palette.char },
  open: { alignSelf: 'flex-start', marginTop: space.s8 },
  old: { marginHorizontal: space.s8, marginTop: space.s32 },
});
