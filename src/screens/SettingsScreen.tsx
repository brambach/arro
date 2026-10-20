import React from 'react';
import { Linking } from 'react-native';
import { PREVIEW_SCENARIOS } from '../data/preview';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { confirmAction, showError } from '../state/confirm';
import { PreviewBehavior } from '../state/purchases';
import { clockTimeLabel } from '../state/reminders';
import { Btn, H, P, PlainScreen, Row } from './plain';

const LINKS = { privacy: 'https://saunafam.com/privacy', help: 'https://saunafam.com/support' };

const openLink = (url: string) =>
  Linking.openURL(url).catch(() => showError('Couldn’t open the page', `It’s at ${url.replace('https://', '')}.`));

const PURCHASE_BEHAVIORS: PreviewBehavior[] = ['succeed', 'fail', 'cancel', 'pending', 'nothingToRestore', 'offline'];

/**
 * Settings, plain until M10. The dev-only Prototype preview at the bottom
 * switches between the preview scenarios (src/data/preview.ts), so every state
 * can be reached without a server.
 */
export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const view = useView();
  const { session, signOut, deleteAccount, checkBeforeDelete, preview, setPreview, setPreviewPurchases, setRules } = useApp();
  const onServer = !!session?.remote;

  const onSignOut = async () => {
    const waiting = view.today.waiting;
    const ok = await confirmAction(
      'Sign out?',
      [
        'Your family and streak stay safe. Sign in with Apple again to come back.',
        view.timer ? 'Your running timer will be discarded.' : '',
        waiting ? `${waiting === 1 ? 'A session hasn’t' : `${waiting} sessions haven’t`} sent yet and will be lost.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      'Sign out',
    );
    if (ok) await signOut();
  };

  const onDelete = async () => {
    const { paysForPlus } = await checkBeforeDelete();
    const ok = await confirmAction(
      'Delete your account?',
      [
        paysForPlus
          ? 'You pay for Saunafam Plus. Deleting your account doesn’t cancel it. Cancel in Settings, Apple ID, Subscriptions first.'
          : '',
        'This deletes your account, every session you’ve logged and your photos. Your family keeps going without you. You can’t undo this.',
      ]
        .filter(Boolean)
        .join(' '),
      'Delete account',
    );
    if (!ok) return;
    try {
      await deleteAccount();
    } catch {
      showError('Couldn’t delete your account', 'Your account is still here. Check your connection and try again.');
    }
  };

  const r = view.rules;
  return (
    <PlainScreen title="Settings" onBack={() => navigation.goBack()}>
      <H>Family rules</H>
      <P>{r.summary}. The week starts on {r.weekStartDay}.</P>
      {r.pendingChange ? <P muted>{`${r.pendingChange.label}: ${r.pendingChange.goal} a week, ${r.pendingChange.minMinutes} minutes or more`}</P> : null}
      {r.canEdit ? (
        <>
          <Btn title="2 a week, 10 minutes" onPress={() => setRules(2, 10)} />
          <Btn title="3 a week, 10 minutes" onPress={() => setRules(3, 10)} />
        </>
      ) : null}
      <Row label="Take a break" value={view.myBreak ? `Until ${view.myBreak.until}` : undefined} onPress={onServer ? () => navigation.navigate('TakeBreak') : undefined} />
      <Row label="Family members" value={`${view.allMembers.length}`} onPress={() => navigation.navigate('FamilyMembers')} />
      <Row label="Streak rules" onPress={() => navigation.navigate('StreakRules')} />
      <Row
        label="Notifications"
        value={session?.me.remindersWanted ? clockTimeLabel(session.me.reminderTime) : 'Off'}
        onPress={() => navigation.navigate('Notifications')}
      />
      {view.plus.visible ? <Row label="Saunafam Plus" value={view.plus.rowLabel ?? undefined} /> : null}
      <Row label="The wall" value={view.plus.wood} />
      <Row label="Privacy" onPress={() => openLink(LINKS.privacy)} />
      <Row label="Help & FAQ" onPress={() => openLink(LINKS.help)} />
      <Btn title="Sign out" onPress={onSignOut} />
      <Btn title="Delete account" onPress={onDelete} />

      {__DEV__ ? (
        <>
          <H>Prototype preview</H>
          <Btn title="My family" selected={preview === null} onPress={() => setPreview(null)} />
          {PREVIEW_SCENARIOS.map((s) => (
            <Btn key={s.id} title={s.label} selected={preview === s.id} onPress={() => setPreview(s.id)} />
          ))}
          <H>Preview App Store</H>
          {PURCHASE_BEHAVIORS.map((b) => (
            <Btn key={b} title={b} onPress={() => setPreviewPurchases(b)} />
          ))}
        </>
      ) : null}
    </PlainScreen>
  );
}
