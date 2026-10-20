import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ListGroup, ListRow } from '../components/ListRow';
import { GroupLabel, GroupNote, SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { PREVIEW_SCENARIOS } from '../data/preview';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { setDevOverrides, useDevOverrides } from '../state/devTools';
import { HEALTH_COPY, useHealthSetting } from '../state/healthSettings';
import { PreviewBehavior } from '../state/purchases';
import { PLUS_PAYER_WARNING, plusNotice, remindersValue, signOutBody } from '../state/settingsCopy';
import { WOOD_NAMES } from './WallScreen';

export const LINKS = { privacy: 'https://saunafam.com/privacy', help: 'https://saunafam.com/support' };

export const SETTINGS_COPY = {
  title: 'Settings',
  family: 'Family',
  you: 'You',
  plus: 'Saunafam Plus',
  help: 'Help',
  familyRules: 'Family rules',
  familyRulesValue: (goal: number) => `${goal} a week`,
  members: 'Family members',
  streakRules: 'Streak rules',
  wall: 'The wall',
  takeBreak: 'Take a break',
  onBreak: (until: string) => `Until ${until}`,
  notifications: 'Notifications',
  health: 'Apple Health',
  plusRow: 'Saunafam Plus',
  restore: 'Restore purchases',
  tip: 'Leave a tip',
  privacy: 'Privacy',
  helpFaq: 'Help & FAQ',
  about: 'About',
  signOut: 'Sign out',
  signOutTitle: 'Sign out?',
  deleteAccount: 'Delete account',
  deleteTitle: 'Delete your account?',
  deleteBody:
    'This deletes your account, every session you’ve logged and your photos. Your family keeps going without you. You can’t undo it.',
  deleteFailed: 'Couldn’t delete your account. It’s still here. Check your connection and try again.',
  linkFailed: (url: string) => `Couldn’t open the page. It’s at ${url.replace('https://', '')}.`,
  restored: (family: string) => `Plus restored for ${family}.`,
  nothingToRestore: 'No purchases found for this Apple ID.',
  restoreOffline: 'Couldn’t reach the App Store. Try again.',
  restoredElsewhere: 'Your family already had Plus, so nothing changed.',
};

const PURCHASE_BEHAVIORS: PreviewBehavior[] = ['succeed', 'fail', 'cancel', 'pending', 'nothingToRestore', 'offline'];

/**
 * Settings (spec, section 3): designed rows, each tappable across its whole
 * width, a value on the right only when there is one. Plus rows appear only
 * with app_config.plus_enabled. Sign out and Delete account confirm in a sheet
 * first; signing out says so when it throws away a running timer.
 *
 * The dev-only Prototype preview and Design sheet stay at the bottom, so every
 * state can be reached without a server.
 */
export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const view = useView();
  const app = useApp();
  const dev = useDevOverrides();
  const health = useHealthSetting();
  const [confirm, setConfirm] = useState<null | 'signOut' | { kind: 'delete'; paysForPlus: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const me = app.session?.me;

  // Dev builds: a deep link can open a confirm for captures (src/navigation/DevLinks.tsx).
  const devConfirm =
    __DEV__ && dev.settingsConfirm
      ? dev.settingsConfirm === 'signOut'
        ? ('signOut' as const)
        : { kind: 'delete' as const, paysForPlus: dev.paysForPlus }
      : null;
  const shown = confirm ?? devConfirm;
  const closeConfirm = () => {
    setConfirm(null);
    setDevOverrides({ settingsConfirm: null });
  };

  const open = (url: string) => Linking.openURL(url).catch(() => setLine(SETTINGS_COPY.linkFailed(url)));

  const askDelete = async () => {
    const { paysForPlus } = await app.checkBeforeDelete();
    setConfirm({ kind: 'delete', paysForPlus: paysForPlus || dev.paysForPlus });
  };

  const doSignOut = async () => {
    setBusy(true);
    try {
      await app.signOut();
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await app.deleteAccount();
      closeConfirm();
    } catch {
      closeConfirm();
      setLine(SETTINGS_COPY.deleteFailed);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setLine(null);
    const result = await app.restorePurchases();
    setLine(
      result.status === 'restored'
        ? SETTINGS_COPY.restored(view.familyName)
        : result.status === 'restoredElsewhere'
          ? SETTINGS_COPY.restoredElsewhere
          : result.status === 'nothing'
            ? SETTINGS_COPY.nothingToRestore
            : SETTINGS_COPY.restoreOffline,
    );
  };

  const notice = view.plus.visible ? plusNotice(view.plus, view.todayKey) : null;

  return (
    <SubScreen title={SETTINGS_COPY.title} onBack={() => navigation.goBack()}>
      <GroupLabel first>{SETTINGS_COPY.family}</GroupLabel>
      <ListGroup>
        <ListRow
          title={SETTINGS_COPY.familyRules}
          value={SETTINGS_COPY.familyRulesValue(view.rules.goal)}
          onPress={() => navigation.navigate('FamilyRules')}
        />
        <ListRow title={SETTINGS_COPY.members} value={String(view.allMembers.length)} onPress={() => navigation.navigate('FamilyMembers')} />
        <ListRow title={SETTINGS_COPY.streakRules} onPress={() => navigation.navigate('StreakRules')} />
        {view.plus.visible ? (
          <ListRow title={SETTINGS_COPY.wall} value={WOOD_NAMES[view.plus.wood]} onPress={() => navigation.navigate('Wall')} />
        ) : null}
      </ListGroup>

      <GroupLabel>{SETTINGS_COPY.you}</GroupLabel>
      <ListGroup>
        <ListRow
          title={SETTINGS_COPY.takeBreak}
          value={view.myBreak ? SETTINGS_COPY.onBreak(view.myBreak.until) : undefined}
          onPress={() => navigation.navigate('TakeBreak')}
        />
        <ListRow
          title={SETTINGS_COPY.notifications}
          value={me ? remindersValue(me.remindersWanted, me.reminderDays, me.reminderTime) : undefined}
          onPress={() => navigation.navigate('Notifications')}
        />
        <ListRow
          title={SETTINGS_COPY.health}
          value={health.state ? HEALTH_COPY.row[health.state] : undefined}
          onPress={() => navigation.navigate('HealthSettings')}
        />
      </ListGroup>

      {view.plus.visible ? (
        <>
          <GroupLabel>{SETTINGS_COPY.plus}</GroupLabel>
          <ListGroup>
            <ListRow title={SETTINGS_COPY.plusRow} value={view.plus.rowLabel ?? undefined} onPress={() => navigation.navigate('Plus')} />
            <ListRow title={SETTINGS_COPY.restore} onPress={restore} />
            <ListRow title={SETTINGS_COPY.tip} onPress={() => navigation.navigate('Plus', { focus: 'tips' })} />
          </ListGroup>
          {notice ? <GroupNote>{notice}</GroupNote> : null}
        </>
      ) : null}

      <GroupLabel>{SETTINGS_COPY.help}</GroupLabel>
      <ListGroup>
        <ListRow title={SETTINGS_COPY.privacy} onPress={() => open(LINKS.privacy)} accessibilityHint="Opens saunafam.com" />
        <ListRow title={SETTINGS_COPY.helpFaq} onPress={() => open(LINKS.help)} accessibilityHint="Opens saunafam.com" />
        <ListRow title={SETTINGS_COPY.about} onPress={() => navigation.navigate('About')} />
      </ListGroup>

      {line ? <Text style={[type.bodySmall, styles.line]}>{line}</Text> : null}

      <View style={styles.account}>
        <TextAction label={SETTINGS_COPY.signOut} onPress={() => setConfirm('signOut')} />
        <TextAction label={SETTINGS_COPY.deleteAccount} tone="coal" onPress={askDelete} style={styles.delete} />
      </View>

      {__DEV__ ? <DevSection navigation={navigation} /> : null}

      <ConfirmSheet
        visible={shown === 'signOut'}
        title={SETTINGS_COPY.signOutTitle}
        body={signOutBody(!!view.timer, view.today.waiting)}
        confirmLabel={SETTINGS_COPY.signOut}
        onConfirm={doSignOut}
        onCancel={closeConfirm}
        busy={busy}
      />
      <ConfirmSheet
        visible={typeof shown === 'object' && shown !== null}
        title={SETTINGS_COPY.deleteTitle}
        warning={typeof shown === 'object' && shown?.paysForPlus ? PLUS_PAYER_WARNING : undefined}
        body={SETTINGS_COPY.deleteBody}
        confirmLabel={SETTINGS_COPY.deleteAccount}
        onConfirm={doDelete}
        onCancel={closeConfirm}
        busy={busy}
      />
    </SubScreen>
  );
}

/** Dev builds only: the preview scenarios, the fake App Store, the Design sheet. */
function DevSection({ navigation }: { navigation: RootStackScreenProps<'Settings'>['navigation'] }) {
  const { preview, setPreview, setPreviewPurchases } = useApp();
  const [behavior, setBehavior] = useState<PreviewBehavior>('succeed');
  return (
    <>
      <GroupLabel>Prototype preview</GroupLabel>
      <ListGroup>
        <ListRow title="My family" value={preview === null ? 'On' : undefined} onPress={() => setPreview(null)} />
        {PREVIEW_SCENARIOS.map((s) => (
          <ListRow key={s.id} title={s.label} value={preview === s.id ? 'On' : undefined} onPress={() => setPreview(s.id)} />
        ))}
      </ListGroup>
      <GroupLabel>Preview App Store</GroupLabel>
      <ListGroup>
        {PURCHASE_BEHAVIORS.map((b) => (
          <ListRow
            key={b}
            title={b}
            value={behavior === b ? 'Next' : undefined}
            onPress={() => {
              setBehavior(b);
              setPreviewPurchases(b);
            }}
          />
        ))}
      </ListGroup>
      <GroupLabel>Design</GroupLabel>
      <ListGroup>
        <ListRow title="Design sheet" onPress={() => navigation.navigate('DesignSheet')} />
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  line: { color: palette.smoke, marginTop: space.s16, marginHorizontal: space.s8 },
  account: { marginTop: space.s40, alignItems: 'center' },
  delete: { marginTop: space.s8 },
});
