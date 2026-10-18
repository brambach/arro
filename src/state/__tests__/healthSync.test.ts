// Runs with TZ=America/Los_Angeles (package.json "test").
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { decodePolyline, LatLng } from '../routes';
import {
  HealthWorkout,
  healthDetails,
  healthLocalDate,
  healthMinutes,
  sendableHealthWorkouts,
  syncHealthWorkouts,
  workoutTypeFor,
} from '../healthSync';
import { fillHealthWorkoutDetails, insertHealthWorkout, WorkoutDateError } from '../backend';

jest.mock('../backend', () => ({
  insertHealthWorkout: jest.fn(),
  fillHealthWorkoutDetails: jest.fn(),
  WorkoutDateError: class WorkoutDateError extends Error {},
}));

const insert = jest.mocked(insertHealthWorkout);
const fill = jest.mocked(fillHealthWorkoutDetails);

// 10am on 17 October in Los Angeles.
const NOW = new Date('2026-10-17T17:00:00Z');

function workout(uuid: string, startIso: string, extra: Partial<HealthWorkout> = {}): HealthWorkout {
  return { uuid, activityType: 'walking', start: new Date(startIso), durationSeconds: 1800, ...extra };
}

/** A straight line heading north, `meters` long, a point every 10 m. */
function line(meters: number): LatLng[] {
  const metersPerDegree = 111_320;
  return Array.from({ length: meters / 10 + 1 }, (_, i) => ({
    latitude: 34 + (i * 10) / metersPerDegree,
    longitude: -118.25,
  }));
}

beforeEach(() => {
  insert.mockReset();
  fill.mockReset();
});

describe('mapping a Health workout', () => {
  it('maps HealthKit activity names to Arro types', () => {
    expect(workoutTypeFor('running')).toBe('run');
    expect(workoutTypeFor('traditionalStrengthTraining')).toBe('gym');
    expect(workoutTypeFor('cycling')).toBe('ride');
    expect(workoutTypeFor('curling')).toBe('other');
  });

  it('dates a workout by the local day it started', () => {
    expect(healthLocalDate(workout('a', '2026-10-17T05:30:00Z'))).toBe('2026-10-16');
  });

  it('rounds minutes, drops zero-length workouts and caps at a day', () => {
    expect(healthMinutes(workout('a', '2026-10-17T16:00:00Z', { durationSeconds: 29 }))).toBeUndefined();
    expect(healthMinutes(workout('a', '2026-10-17T16:00:00Z', { durationSeconds: 90 }))).toBe(2);
    expect(healthMinutes(workout('a', '2026-10-17T16:00:00Z', { durationSeconds: 200_000 }))).toBe(1440);
  });

  it('trims the route ends before it leaves the phone', () => {
    const raw = line(2000);
    const details = healthDetails(workout('a', '2026-10-17T16:00:00Z', { route: raw, distanceMeters: 2000.4 }));
    expect(details.distanceMeters).toBe(2000);
    const shared = decodePolyline(details.route!);
    expect(shared.length).toBeGreaterThan(1);
    // The first 200 m are gone: the shared start is well north of the real one.
    expect(shared[0].latitude - raw[0].latitude).toBeGreaterThan(150 / 111_320);
  });

  it('leaves out a route too short to share and an impossible distance', () => {
    const details = healthDetails(workout('a', '2026-10-17T16:00:00Z', { route: line(500), distanceMeters: 2_000_000 }));
    expect(details.route).toBeUndefined();
    expect(details.distanceMeters).toBeUndefined();
  });
});

describe('which workouts go to the server', () => {
  const today = workout('today', '2026-10-17T16:00:00Z');
  const yesterday = workout('yesterday', '2026-10-16T16:00:00Z');
  const older = workout('older', '2026-10-15T16:00:00Z');

  it('sends today and yesterday', () => {
    expect(sendableHealthWorkouts([today, yesterday, older], NOW).map((w) => w.uuid)).toEqual(['today', 'yesterday']);
  });

  it('stops sending yesterday once the server has closed it', () => {
    const evening = new Date('2026-10-18T01:00:00Z'); // 6pm on the 17th
    expect(sendableHealthWorkouts([today, yesterday], evening).map((w) => w.uuid)).toEqual(['today']);
  });
});

describe('syncHealthWorkouts', () => {
  it('counts what was added, already there, filled in and skipped', async () => {
    insert
      .mockResolvedValueOnce('added')
      .mockResolvedValueOnce('synced')
      .mockRejectedValueOnce(new WorkoutDateError('closed'));
    fill.mockResolvedValueOnce(true);

    const result = await syncHealthWorkouts(
      'member-1',
      [
        workout('new', '2026-10-17T16:00:00Z'),
        workout('known', '2026-10-17T15:00:00Z', { route: line(2000) }),
        workout('late', '2026-10-16T16:00:00Z'),
        workout('old', '2026-10-10T16:00:00Z'),
      ],
      NOW,
    );

    expect(result).toEqual({ added: 1, alreadySynced: 1, updated: 1, skipped: 2 });
    expect(insert).toHaveBeenCalledTimes(3);
    expect(insert.mock.calls[0][1]).toMatchObject({ healthWorkoutId: 'new', localDate: '2026-10-17', type: 'walk', minutes: 30 });
    expect(fill).toHaveBeenCalledWith('member-1', 'known', expect.objectContaining({ route: expect.any(String) }));
  });

  it('passes on errors other than a closed day', async () => {
    insert.mockRejectedValueOnce(new Error('offline'));
    await expect(syncHealthWorkouts('member-1', [workout('new', '2026-10-17T16:00:00Z')], NOW)).rejects.toThrow('offline');
  });
});
