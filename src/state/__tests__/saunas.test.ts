import { describe, expect, it } from '@jest/globals';
import {
  cToF,
  fToC,
  joinNames,
  numberWord,
  recentPlaces,
  saunaTypeLabels,
  sessionDetails,
  temperatureLabel,
  temperatureRange,
  unitForLocaleTag,
} from '../../data/saunas';
import { streakRulesFor } from '../../data/streakRules';
import { paletteColor } from '../../data/palette';
import { changesJson, isNetworkError, toSession } from '../backend';
import { UUID_PATTERN, fallbackUUID, uuid } from '../uuid';

describe('sauna words', () => {
  it('labels every type', () => {
    expect(Object.values(saunaTypeLabels)).toEqual(['Traditional', 'Wood-fired', 'Infrared', 'Steam room', 'Smoke', 'Banya', 'Other']);
  });

  it('writes the details line in °C or °F', () => {
    const s = { durationMinutes: 20, saunaType: 'traditional' as const, tempC: 85 };
    expect(sessionDetails(s, 'C')).toBe('20 min · Traditional · 85°C');
    expect(sessionDetails(s, 'F')).toBe('20 min · Traditional · 185°F');
    expect(sessionDetails({ ...s, tempC: null }, 'C')).toBe('20 min · Traditional');
  });

  it('converts temperatures and keeps the form’s range', () => {
    expect(cToF(100)).toBe(212);
    expect(fToC(185)).toBe(85);
    expect(fToC(190)).toBe(87.8);
    expect(temperatureLabel(87.8, 'C')).toBe('88°C');
    expect(temperatureRange('C')).toEqual({ min: 30, max: 130 });
    expect(temperatureRange('F')).toEqual({ min: 86, max: 266 });
  });

  it('falls back to Arro’s region rule: the US, Liberia and Myanmar get °F', () => {
    expect(unitForLocaleTag('en-US')).toBe('F');
    expect(unitForLocaleTag('en_LR')).toBe('F');
    expect(unitForLocaleTag('my-MM')).toBe('F');
    expect(unitForLocaleTag('en-GB')).toBe('C');
    expect(unitForLocaleTag('fi-FI')).toBe('C');
    expect(unitForLocaleTag('en')).toBe('C');
    expect(unitForLocaleTag(null)).toBe('C');
  });

  it('joins names and spells numbers', () => {
    expect(joinNames(['Maya'])).toBe('Maya');
    expect(joinNames(['Maya', 'Jo'])).toBe('Maya and Jo');
    expect(joinNames(['Maya', 'Jo', 'Sam'])).toBe('Maya, Jo and Sam');
    expect([1, 10, 15, 20, 25, 60].map(numberWord)).toEqual(['One', 'Ten', 'Fifteen', 'Twenty', 'Twenty-five', 'Sixty']);
  });

  it('chips: the family’s 5 most recent places, newest first, one per spelling', () => {
    const at = (d: number) => `2026-10-${String(d).padStart(2, '0')}T18:00:00Z`;
    const places = recentPlaces([
      { place: 'Home', startedAt: at(20) },
      { place: 'bathhouse', startedAt: at(19) },
      { place: 'Bathhouse', startedAt: at(21) },
      { place: null, startedAt: at(22) },
      { place: 'Lake cabin', startedAt: at(18) },
      { place: 'Gym sauna', startedAt: at(17) },
      { place: 'Spa', startedAt: at(16) },
      { place: 'Pier', startedAt: at(15) },
    ]);
    expect(places).toEqual(['Bathhouse', 'Home', 'Lake cabin', 'Gym sauna', 'Spa']);
  });

  it('rules follow the family’s rhythm', () => {
    const rules = streakRulesFor({ goal: 2, minMinutes: 15, weekStartsOn: 7 });
    expect(rules).toHaveLength(7);
    expect(rules[1].body).toBe('Each of you does 2 sessions a week, 15 minutes or more. Two in one day counts once.');
    expect(rules[2].body).toBe('The week runs Sunday to Saturday, in your own time zone.');
  });

  it('hands out the server palette in join order', () => {
    expect([0, 1, 6].map(paletteColor)).toEqual(['#5F8794', '#B58A3C', '#5F8794']);
  });
});

describe('backend mapping', () => {
  it('update_session gets only the keys present, with null to clear', () => {
    expect(changesJson({ durationMinutes: 25, place: null, note: undefined, coldPlunge: false })).toEqual({
      duration_minutes: 25,
      place: null,
      cold_plunge: false,
    });
  });

  it('reads a sessions row, numeric temperatures included', () => {
    const s = toSession(
      {
        id: 's1',
        member_id: 'm1',
        shared_id: null,
        logged_by: 'm1',
        started_at: '2026-10-21T02:00:00Z',
        local_date: '2026-10-20',
        duration_minutes: 20,
        rounds: 2,
        sauna_type: 'wood_fired',
        temp_c: '85.5',
        humidity_pct: null,
        cold_plunge: true,
        cold_minutes: 2,
        place: 'Home',
        note: null,
        photo_path: 'f/m1/x.jpg',
        source: 'timer',
        client_id: 'c1',
        created_at: '2026-10-21T02:30:00Z',
        updated_at: '2026-10-21T02:30:00Z',
      },
      { 'f/m1/x.jpg': 'https://signed' },
    );
    expect(s).toMatchObject({ tempC: 85.5, saunaType: 'wood_fired', photoUrl: 'https://signed', source: 'timer' });
  });

  it('tells a network failure from a server answer', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError({ message: 'FetchError: request to x failed' })).toBe(true);
    expect(isNetworkError({ code: '22023', message: 'connection' })).toBe(false);
  });
});

describe('client ids', () => {
  it('are version 4 UUIDs', () => {
    expect(uuid()).toMatch(UUID_PATTERN);
    expect(fallbackUUID(() => 0.99)).toMatch(UUID_PATTERN);
    expect(new Set(Array.from({ length: 50 }, uuid)).size).toBe(50);
  });
});
