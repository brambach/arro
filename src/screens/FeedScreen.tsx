import React from 'react';
import { MainTabScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { Btn, H, P, PlainScreen } from './plain';

/** The feed, as plain text until M9 builds the cards: this week and last week (view.feed). */
export function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  const view = useView();
  const { refresh, cheer, uncheer } = useApp();
  return (
    <PlainScreen title="Feed" onRefresh={refresh}>
      {view.feed.empty ? <P muted>No saunas this week or last yet.</P> : null}
      {view.feed.sections.map((section) => (
        <React.Fragment key={section.key}>
          <H>{section.title}</H>
          {section.cards.map((c) => (
            <React.Fragment key={c.id}>
              <Btn title={c.title} onPress={() => navigation.navigate('SessionDetail', { sessionId: c.id })} />
              <P muted>
                {c.details}
                {c.coldPlunge ? ' · cold plunge' : ''} · {c.when}
                {c.place ? ` · ${c.place}` : ''}
                {c.pending ? ' · waiting to send' : ''}
              </P>
              {c.note ? <P>{c.note}</P> : null}
              {c.cheers.line ? <P muted>{c.cheers.line}</P> : null}
              {c.canCheer ? <Btn title={c.cheers.byMe ? 'Cheered' : c.cheerLabel} onPress={() => (c.cheers.byMe ? uncheer(c.id) : cheer(c.id))} /> : null}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </PlainScreen>
  );
}
