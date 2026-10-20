import React from 'react';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { Btn, H, P, PlainScreen, Row } from './plain';

/** Me, as plain text until M9 builds it: view.profile. */
export function ProfileScreen({ navigation }: MainTabScreenProps<'Me'>) {
  const view = useView();
  const { refresh } = useApp();
  const p = view.profile;
  return (
    <PlainScreen title={p.name} onRefresh={refresh}>
      <P muted>{p.familyName}</P>
      <Btn title="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
      <Btn title="Settings" onPress={() => navigation.navigate('Settings')} />
      {p.stats.map((s) => (
        <Row key={s.key} label={s.label} value={s.unit ? `${s.value} ${s.unit}` : s.value} />
      ))}
      {p.favoriteType ? <Row label="Favorite type" value={p.favoriteType} /> : null}
      {p.favoritePlace ? <Row label="Favorite place" value={p.favoritePlace} /> : null}
      <H>Last sessions</H>
      {p.recent.map((c) => (
        <Row key={c.id} label={c.details} value={c.when} onPress={() => navigation.navigate('SessionDetail', { sessionId: c.id })} />
      ))}
      <H>Badges</H>
      <P>{p.badges.map((b) => `${b.label}${b.earned ? ' ✓' : ''}`).join(' · ')}</P>
      {p.plusRows ? (
        <>
          <Row label="Heat log" value="Plus" />
          <Row label="Timer face" value="Plus" />
          <Row label="App icon" value="Plus" />
        </>
      ) : null}
    </PlainScreen>
  );
}
