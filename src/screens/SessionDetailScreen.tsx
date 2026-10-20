import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { confirmAction } from '../state/confirm';
import { pickPhoto } from '../state/photos';
import { Btn, H, P, PlainScreen } from './plain';

/** One session, as plain text until M9 builds it: view.sessions[sessionId]. */
export function SessionDetailScreen({ navigation, route }: RootStackScreenProps<'SessionDetail'>) {
  const view = useView();
  const { cheer, uncheer, comment, deleteComment, removeMe, deleteSession, setSessionPhoto } = useApp();
  const [text, setText] = useState('');
  const c = view.sessions[route.params.sessionId];
  if (!c) {
    return (
      <PlainScreen title="Session" onBack={() => navigation.goBack()}>
        <P muted>This session isn’t here anymore.</P>
      </PlainScreen>
    );
  }
  const send = (body: string) => {
    comment(c.id, body);
    setText('');
  };
  return (
    <PlainScreen title={c.title} onBack={() => navigation.goBack()}>
      <P>{c.details}</P>
      <P muted>
        {c.when}
        {c.rounds > 1 ? ` · ${c.rounds} rounds` : ''}
        {c.coldPlunge ? ` · cold plunge${c.coldMinutes ? ` ${c.coldMinutes} min` : ''}` : ''}
        {c.place ? ` · ${c.place}` : ''}
      </P>
      {c.note ? <P>{c.note}</P> : null}
      {c.pending ? <P muted>Waiting to send. It’ll go when you’re back online.</P> : null}
      {c.cheers.line ? <P muted>{c.cheers.line}</P> : null}
      {c.canCheer ? <Btn title={c.cheers.byMe ? 'Cheered' : c.cheerLabel} onPress={() => (c.cheers.byMe ? uncheer(c.id) : cheer(c.id))} /> : null}

      <H>Comments</H>
      {c.comments.map((m) => (
        <P key={m.id} muted={m.pending}>
          {m.member.name}: {m.body}
        </P>
      ))}
      {c.comments
        .filter((m) => m.canDelete)
        .map((m) => (
          <Btn key={`del-${m.id}`} title={`Delete “${m.body}”`} onPress={() => deleteComment(m.id)} />
        ))}
      {!c.pending
        ? c.quickReplies.map((r) => <Btn key={r} title={r} onPress={() => send(r)} />)
        : null}
      {!c.pending ? (
        <>
          <TextInput value={text} onChangeText={setText} maxLength={200} placeholder="Say something" accessibilityLabel="Comment" />
          <Btn title="Send" disabled={!text.trim()} onPress={() => send(text)} />
        </>
      ) : null}

      {c.canEdit ? (
        <Btn
          title={c.photoUri ? 'Change photo' : 'Add a photo'}
          onPress={async () => {
            const uri = await pickPhoto('landscape');
            if (uri) await setSessionPhoto(c.id, uri);
          }}
        />
      ) : null}
      {c.canRemoveMe ? (
        <Btn
          title="Remove me from this session"
          onPress={async () => {
            if (await confirmAction('Remove you from this session?', 'It comes off your week. Everyone else keeps it.', 'Remove me')) {
              removeMe(c.id);
              navigation.goBack();
            }
          }}
        />
      ) : null}
      {c.canDelete ? (
        <Btn
          title="Delete session"
          onPress={async () => {
            if (await confirmAction('Delete this session?', 'It goes for everyone in it, with its cheers and comments.', 'Delete')) {
              deleteSession(c.id);
              navigation.goBack();
            }
          }}
        />
      ) : null}
    </PlainScreen>
  );
}
