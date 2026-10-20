import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { MINUTE_CHIPS, SAUNA_TYPES, saunaTypeLabels } from '../data/saunas';
import { SaunaType } from '../data/types';
import { RootStackScreenProps } from '../navigation/types';
import { SessionForm, useApp, useView } from '../state/AppState';
import { COPY } from '../state/buildView';
import { addDays, dayKey, fromKey } from '../state/dates';
import { Btn, Choices, H, P, PlainScreen } from './plain';

/** When a session started: today now (less its length), or yesterday evening. */
function startFor(day: 'today' | 'yesterday', minutes: number): string {
  if (day === 'today') return new Date(Date.now() - minutes * 60_000).toISOString();
  const d = fromKey(addDays(dayKey(), -1));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0).toISOString();
}

/**
 * The log form, plain until M8 builds it. It already saves through the outbox:
 * blank, for yesterday, prefilled from the timer, or fixing a refused draft.
 */
export function LogSessionScreen({ navigation, route }: RootStackScreenProps<'LogSession'>) {
  const view = useView();
  const { logSession, resendDraft, discardDraft, draftFor, lastSaunaType } = useApp();
  const params = route.params ?? {};
  const draft = params.draftId ? draftFor(params.draftId) : null;
  const prefill = params.prefill;

  const [day, setDay] = useState<'today' | 'yesterday'>(params.day ?? 'today');
  const [minutes, setMinutes] = useState(draft?.input.durationMinutes ?? prefill?.durationMinutes ?? 15);
  const [type, setType] = useState<SaunaType>(draft?.input.saunaType ?? prefill?.saunaType ?? lastSaunaType);
  const [rounds, setRounds] = useState(draft?.input.rounds ?? prefill?.rounds ?? 1);
  const [place, setPlace] = useState(draft?.input.place ?? '');
  const [withIds, setWithIds] = useState<string[]>(draft?.input.withIds ?? []);
  const [plunge, setPlunge] = useState(draft?.input.coldPlunge ?? false);
  const [note, setNote] = useState(draft?.input.note ?? '');
  const [message, setMessage] = useState<string | null>(draft ? draft.message : null);

  const save = async () => {
    const form: SessionForm = {
      startedAt: prefill && !draft ? prefill.startedAt : startFor(day, minutes),
      durationMinutes: minutes,
      saunaType: type,
      rounds,
      place,
      note,
      coldPlunge: plunge,
      withIds,
      source: prefill ? 'timer' : 'manual',
    };
    const outcome = draft ? await resendDraft(draft.input.clientId, form) : await logSession(form);
    if (outcome.status === 'refused') {
      setMessage(outcome.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <PlainScreen title={draft ? 'Fix this session' : 'Log a session'} onBack={() => navigation.goBack()}>
      {message ? <P>Couldn’t save this one: {message}</P> : null}
      {!prefill ? (
        <>
          <H>When</H>
          <Choices options={['today', 'yesterday'] as const} value={day} onChange={setDay} label={(d) => (d === 'today' ? 'Today' : 'Yesterday')} />
        </>
      ) : null}
      <H>Minutes</H>
      <Choices options={[...new Set([...MINUTE_CHIPS, minutes])].sort((a, b) => a - b)} value={minutes} onChange={setMinutes} />
      {minutes < view.minMinutes ? <P muted>{COPY.shortSession(view.minMinutes)}</P> : null}
      <H>Sauna</H>
      <Choices options={SAUNA_TYPES} value={type} onChange={setType} label={(t) => saunaTypeLabels[t]} />
      <H>Rounds</H>
      <Choices options={[1, 2, 3, 4, 5] as const} value={rounds} onChange={setRounds} />
      <H>Place</H>
      <TextInput value={place} onChangeText={setPlace} maxLength={60} placeholder="Home" accessibilityLabel="Place" />
      <Choices options={view.recentPlaces} value={place} onChange={setPlace} />
      <H>Cold plunge</H>
      <Choices options={['no', 'yes'] as const} value={plunge ? 'yes' : 'no'} onChange={(v) => setPlunge(v === 'yes')} label={(v) => (v === 'yes' ? 'Yes' : 'No')} />
      {view.sessionCompanions.length ? (
        <>
          <H>Sat with someone?</H>
          {view.sessionCompanions.map((m) => (
            <Btn
              key={m.id}
              title={m.name}
              selected={withIds.includes(m.id)}
              disabled={!withIds.includes(m.id) && withIds.length >= 3}
              onPress={() => setWithIds((ids) => (ids.includes(m.id) ? ids.filter((i) => i !== m.id) : [...ids, m.id]))}
            />
          ))}
        </>
      ) : null}
      <H>Note</H>
      <TextInput value={note} onChangeText={setNote} maxLength={140} placeholder="How was it?" accessibilityLabel="Note" />
      <Btn title="Save" onPress={save} />
      {draft ? (
        <Btn
          title="Discard"
          onPress={async () => {
            await discardDraft(draft.input.clientId);
            navigation.goBack();
          }}
        />
      ) : null}
    </PlainScreen>
  );
}
