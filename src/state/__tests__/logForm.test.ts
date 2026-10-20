// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { finish, startTimer } from '../timer';
import { SessionDraft } from '../outbox';
import {
  LogFormState,
  canStepLater,
  draftReason,
  firstError,
  initialForm,
  isDirty,
  isShort,
  skippedLine,
  startLabel,
  stepStart,
  toSessionForm,
  toggleCompanion,
  validate,
  withDay,
  withMinutes,
} from '../logForm';

const NOW = new Date(2026, 9, 22, 19, 32); // Thursday 7:32 PM
const blank = (over: Partial<Parameters<typeof initialForm>[0]> = {}) =>
  initialForm({ now: NOW, unit: 'C', lastSaunaType: 'wood_fired', ...over });

describe('the log form starts', () => {
  it('blank: today, the last type, 15 minutes, starting now minus the minutes', () => {
    const { state, whenNote } = blank();
    expect(state.day).toBe('today');
    expect(state.saunaType).toBe('wood_fired');
    expect(state.minutes).toBe('15');
    expect(startLabel(state.startMinutes)).toBe('7:15 PM');
    expect(whenNote).toBeNull();
  });

  it('for yesterday at 6 PM', () => {
    const { state } = blank({ day: 'yesterday' });
    expect(state.day).toBe('yesterday');
    expect(startLabel(state.startMinutes)).toBe('6:00 PM');
  });

  it('from the timer, with its start, minutes, rounds and type', () => {
    const t = startTimer(new Date(2026, 9, 22, 19, 0), { targetMinutes: 15, saunaType: 'smoke' });
    const result = finish(t, new Date(2026, 9, 22, 19, 21, 10));
    const { state } = blank({ prefill: { ...result, rounds: 2 } });
    expect(state.minutes).toBe('21');
    expect(state.rounds).toBe(2);
    expect(state.saunaType).toBe('smoke');
    expect(startLabel(state.startMinutes)).toBe('7:00 PM');
    expect(state.startTouched).toBe(true);
  });

  it('from a timer started before midnight: dated by its start, yesterday', () => {
    const t = startTimer(new Date(2026, 9, 21, 23, 50), { targetMinutes: 15, saunaType: 'traditional' });
    const result = finish(t, new Date(2026, 9, 22, 0, 10));
    const { state } = initialForm({ now: new Date(2026, 9, 22, 0, 12), unit: 'C', lastSaunaType: 'traditional', prefill: result });
    expect(state.day).toBe('yesterday');
    expect(startLabel(state.startMinutes)).toBe('11:50 PM');
  });

  it('from the 3-hour prompt, asking for the real minutes', () => {
    const t = startTimer(new Date(2026, 9, 22, 16, 0), { targetMinutes: 15, saunaType: 'traditional' });
    const { state } = blank({ prefill: finish(t, NOW), askTime: true });
    expect(state.minutes).toBe('');
    expect(validate(state, 'C', NOW).minutes).toBe('How many minutes were you in?');
  });

  it('from a refused draft, in your unit, and says when its date is too old', () => {
    const draft: SessionDraft = {
      input: {
        familyId: 'f',
        clientId: 'c',
        startedAt: new Date(2026, 9, 19, 18, 0).toISOString(),
        durationMinutes: 20,
        saunaType: 'banya',
        rounds: 3,
        tempC: 85,
        humidityPct: 20,
        coldPlunge: true,
        coldMinutes: 2,
        place: 'Home',
        note: 'Lovely',
        source: 'manual',
        withIds: ['jo'],
      },
      memberId: 'me',
      photoUri: null,
      refusedAt: NOW.toISOString(),
      code: '22023',
      message: 'sessions can only be logged for today or yesterday',
    };
    const { state, whenNote } = initialForm({ now: NOW, unit: 'F', lastSaunaType: 'traditional', draft });
    expect(state.temp).toBe('185');
    expect(state.withIds).toEqual(['jo']);
    expect(state.day).toBe('today');
    expect(whenNote).toMatch(/today or yesterday/);
    expect(draftReason(draft.message)).toBe('Sessions can only be logged for today or yesterday.');
  });
});

describe('editing', () => {
  it('keeps an untouched start at now minus the minutes', () => {
    const s = withMinutes(blank().state, '30', NOW);
    expect(startLabel(s.startMinutes)).toBe('7:00 PM');
  });

  it('leaves a start that was set by hand', () => {
    let s: LogFormState = { ...blank().state, startTouched: true };
    s = withMinutes(s, '40', NOW);
    expect(startLabel(s.startMinutes)).toBe('7:15 PM');
  });

  it('steps the start 5 minutes at a time, never after now today', () => {
    const s = { ...blank().state, startMinutes: 19 * 60 + 30 };
    expect(startLabel(stepStart(s, 1, NOW))).toBe('7:32 PM');
    expect(canStepLater({ ...s, startMinutes: 19 * 60 + 32 }, NOW)).toBe(false);
    expect(startLabel(stepStart({ ...s, startMinutes: 19 * 60 + 32 }, -1, NOW))).toBe('7:30 PM');
    expect(startLabel(stepStart({ ...s, startMinutes: 19 * 60 + 25 }, -1, NOW))).toBe('7:20 PM');
  });

  it('lets yesterday go to the end of the day', () => {
    const s = withDay(blank().state, 'yesterday', NOW);
    expect(startLabel(s.startMinutes)).toBe('6:00 PM');
    expect(canStepLater({ ...s, startMinutes: 23 * 60 + 55 }, NOW)).toBe(false);
  });

  it('picks up to 3 others', () => {
    let s = blank().state;
    for (const id of ['a', 'b', 'c', 'd']) s = toggleCompanion(s, id);
    expect(s.withIds).toEqual(['a', 'b', 'c']);
    s = toggleCompanion(s, 'b');
    expect(s.withIds).toEqual(['a', 'c']);
  });

  it('notices a change worth asking about before closing', () => {
    const first = blank().state;
    expect(isDirty(first, first)).toBe(false);
    expect(isDirty({ ...first, note: 'Hot' }, first)).toBe(true);
  });
});

describe('checks', () => {
  it('shows the quiet short-session line under the family minimum only', () => {
    const s = blank().state;
    expect(isShort({ ...s, minutes: '8' }, 10)).toBe(true);
    expect(isShort({ ...s, minutes: '10' }, 10)).toBe(false);
    expect(isShort({ ...s, minutes: '' }, 10)).toBe(false);
  });

  it('enforces the server ranges in plain words', () => {
    const s = blank().state;
    expect(validate({ ...s, minutes: '0' }, 'C', NOW).minutes).toBe('Minutes take a whole number, 1 or more.');
    expect(validate({ ...s, minutes: '241' }, 'C', NOW).minutes).toBe('Sessions go up to 240 minutes.');
    expect(validate({ ...s, minutes: '240' }, 'C', NOW).minutes).toBeUndefined();
    expect(validate({ ...s, temp: '29' }, 'C', NOW).temp).toBe('Somewhere from 30 to 130°C.');
    expect(validate({ ...s, temp: '85' }, 'F', NOW).temp).toBe('Somewhere from 86 to 266°F.');
    expect(validate({ ...s, temp: '266' }, 'F', NOW).temp).toBeUndefined();
    expect(validate({ ...s, humidity: '101' }, 'C', NOW).humidity).toBe('Somewhere from 0 to 100%.');
    expect(validate({ ...s, coldPlunge: true, coldMinutes: '31' }, 'C', NOW).coldMinutes).toBe('Up to 30 minutes.');
    expect(validate({ ...s, coldPlunge: false, coldMinutes: '31' }, 'C', NOW).coldMinutes).toBeUndefined();
    expect(validate({ ...s, startMinutes: 20 * 60 }, 'C', NOW).when).toMatch(/later than now/);
    expect(validate(s, 'C', NOW)).toEqual({});
  });

  it('says when yesterday has closed (the server keeps a day only until UTC moves on)', () => {
    const s = withDay(blank().state, 'yesterday', NOW);
    // 7:32 PM in Los Angeles is past UTC midnight: yesterday closed at 5:00 PM.
    expect(validate(s, 'C', NOW).when).toBe('Yesterday closed at 5:00 PM. This one can go on today.');
    const morning = new Date(2026, 9, 22, 9, 0);
    expect(validate(withDay(initialForm({ now: morning, unit: 'C', lastSaunaType: 'traditional' }).state, 'yesterday', morning), 'C', morning).when).toBeUndefined();
  });

  it('points at the first field to fix, top to bottom', () => {
    expect(firstError({ note: 'x', minutes: 'y' })).toBe('minutes');
    expect(firstError({})).toBeNull();
  });
});

describe('saving', () => {
  it('stores °C: typed °F converts, to one decimal', () => {
    const s = { ...blank({ unit: 'F' }).state, temp: '185', humidity: '15', place: ' The Y ', note: '' };
    const form = toSessionForm(s, 'F', NOW, 'manual');
    expect(form.tempC).toBe(85);
    expect(toSessionForm({ ...s, temp: '190' }, 'F', NOW, 'manual').tempC).toBe(87.8);
    expect(form.humidityPct).toBe(15);
    expect(form.place).toBe('The Y');
    expect(form.note).toBeNull();
    expect(form.durationMinutes).toBe(15);
    expect(new Date(form.startedAt).getHours()).toBe(19);
    expect(new Date(form.startedAt).getMinutes()).toBe(15);
  });

  it('drops cold minutes when the plunge is off, and dates yesterday by the phone', () => {
    const s = { ...withDay(blank().state, 'yesterday', NOW), coldPlunge: false, coldMinutes: '4' };
    const form = toSessionForm(s, 'C', NOW, 'timer');
    expect(form.coldMinutes).toBeNull();
    expect(form.source).toBe('timer');
    expect(new Date(form.startedAt).getDate()).toBe(21);
  });

  it('names whoever the server skipped', () => {
    expect(skippedLine(['Jo'])).toBe('Jo already logged this one');
    expect(skippedLine(['Maya', 'Jo'])).toBe('Maya and Jo already logged this one');
    expect(skippedLine([])).toBeNull();
  });
});
