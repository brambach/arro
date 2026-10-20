// A smoke test of the provider with no server: the preview family, scenarios,
// logging, cheering and the timer all work in memory.
import { beforeEach, describe, expect, it } from '@jest/globals';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TestRenderer, { act } from 'react-test-renderer';
import { AppStateProvider, useApp } from '../AppState';
import { SESSION_KEY } from '../session';

type Ctx = ReturnType<typeof useApp>;
let ctx: Ctx | null = null;

function Probe() {
  const value = useApp();
  React.useEffect(() => {
    ctx = value;
  });
  return null;
}

const current = (): Ctx => {
  if (!ctx) throw new Error('no context yet');
  return ctx;
};

async function mount() {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );
  });
  // Let the launch effect read storage.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return renderer;
}

const localSession = {
  version: 1,
  role: 'founder',
  me: { id: 'sam', name: 'Sam', color: '#5F8794', photoUri: null, reminderDays: [4, 6], reminderTime: '18:30', remindersWanted: false, joinedOn: '2026-08-01' },
  family: { name: 'Sunday sauna', joinCode: 'SAUNA234', invited: [] },
};

describe('AppStateProvider without a server', () => {
  beforeEach(async () => {
    ctx = null;
    await AsyncStorage.clear();
  });

  it('has no view before anyone signs in', async () => {
    const r = await mount();
    expect(current().ready).toBe(true);
    expect(current().view).toBeNull();
    act(() => r?.unmount());
  });

  it('shows the preview family, switches scenarios, and logs, cheers and times in memory', async () => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(localSession));
    await AsyncStorage.setItem('arro.moveMethod.v1', 'health');
    const r = await mount();
    const view = current().view;
    expect(view?.familyName).toBe('Sunday sauna');
    expect(view?.today.streak.value).toBe(8);
    // Arro's keys are gone.
    expect(await AsyncStorage.getItem('arro.moveMethod.v1')).toBeNull();

    await act(async () => current().setPreview('solo'));
    expect(current().view?.today.streak.kind).toBe('solo');

    await act(async () => current().setPreview('family'));
    const before = current().view?.today.you.countedDays ?? 0;
    await act(async () => {
      const outcome = await current().logSession({ startedAt: new Date().toISOString(), durationMinutes: 20, saunaType: 'infrared' });
      expect(outcome).toEqual({ status: 'saved', skippedNames: [] });
    });
    expect(current().lastSaunaType).toBe('infrared');
    const card = current().view?.feed.sections[0].cards.find((c) => c.mine && c.saunaType === 'infrared');
    expect(card).toBeDefined();
    expect(current().view?.today.you.countedDays).toBeGreaterThanOrEqual(before);

    const others = current().view?.feed.sections[0].cards.find((c) => c.canCheer);
    await act(async () => current().cheer(others?.id ?? ''));
    expect(current().view?.sessions[others?.id ?? ''].cheers.byMe).toBe(true);

    await act(async () => {
      await current().startTimer();
    });
    expect(current().view?.timer?.targetMinutes).toBe(15);
    const again = await current().startTimer({ targetMinutes: 30 });
    expect(again.targetMinutes).toBe(15); // one timer at a time
    let result: Awaited<ReturnType<Ctx['finishTimer']>> = null;
    await act(async () => {
      result = await current().finishTimer();
    });
    expect(result).toMatchObject({ durationMinutes: 1, saunaType: 'infrared' });
    expect(current().view?.timer).toBeNull();

    await act(async () => current().setPreview('milestone'));
    expect(current().view?.milestone?.title).toBe('8 weeks together');
    await act(async () => current().markMilestoneShown());
    expect(current().view?.milestone).toBeNull();
    act(() => r?.unmount());
  });
});
