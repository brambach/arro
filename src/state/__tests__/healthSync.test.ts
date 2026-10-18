// Runs with TZ=America/Los_Angeles (package.json "test").
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { decodePolyline, LatLng } from '../routes';
import {
  HealthWorkout,
  healthDetails,
  healthLocalDate,
  healthMinutes,
  healthSourceLabel,
  MIN_HEALTH_SECONDS,
  planHealthSync,
  sendableHealthWorkouts,
  syncHealthWorkouts,
  workoutTypeFor,
} from '../healthSync';
import {
  deleteWorkout,
  fillHealthWorkoutDetails,
  insertHealthWorkout,
  replaceHealthWorkout,
  SavedHealthWorkout,
  WorkoutDateError,
} from '../backend';

jest.mock('../backend', () => ({
  insertHealthWorkout: jest.fn(),
  fillHealthWorkoutDetails: jest.fn(),
  replaceHealthWorkout: jest.fn(),
  deleteWorkout: jest.fn(),
  WorkoutDateError: class WorkoutDateError extends Error {},
}));

const insert = jest.mocked(insertHealthWorkout);
const fill = jest.mocked(fillHealthWorkoutDetails);
const replace = jest.mocked(replaceHealthWorkout);
const remove = jest.mocked(deleteWorkout);

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
  replace.mockReset();
  remove.mockReset();
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

function savedRow(id: string, healthWorkoutId: string, startIso: string, minutes = 30): SavedHealthWorkout {
  return { id, healthWorkoutId, localDate: startIso.slice(0, 10), startedAt: startIso, minutes };
}

describe('planHealthSync', () => {
  const watch = workout('watch', '2026-10-17T16:00:00Z', { sourceId: 'com.apple.health.abc', route: line(2000) });
  const whoop = workout('whoop', '2026-10-17T16:02:00Z', { sourceId: 'com.whoop.iphone' });

  it('counts a workout two apps recorded once, keeping the copy with a route', () => {
    const plan = planHealthSync([whoop, watch], [], NOW);
    expect(plan.insert.map((w) => w.uuid)).toEqual(['watch']);
    expect(plan.skipped).toBe(1);
  });

  it('leaves out workouts under five minutes', () => {
    const blip = workout('blip', '2026-10-17T15:00:00Z', { durationSeconds: MIN_HEALTH_SECONDS - 1 });
    expect(planHealthSync([blip], [], NOW).insert).toEqual([]);
  });

  it('points a saved worse copy at the better one instead of adding another row', () => {
    const plan = planHealthSync([whoop, watch], [savedRow('row-1', 'whoop', '2026-10-17T16:02:00Z')], NOW);
    expect(plan.insert).toEqual([]);
    expect(plan.replace).toEqual([{ rowId: 'row-1', with: watch }]);
    expect(plan.remove).toEqual([]);
  });

  it('removes a row gone from Health only when Health could be read in full', () => {
    const saved = [savedRow('row-gone', 'gone', '2026-10-17T14:00:00Z')];
    expect(planHealthSync([watch], saved, NOW).remove).toEqual([]);
    expect(planHealthSync([watch], saved, NOW, { canRemove: true }).remove).toEqual(['row-gone']);
  });

  it('removes nothing as gone when the read comes back empty (Health access turned off)', () => {
    const saved = [savedRow('row-1', 'a', '2026-10-17T14:00:00Z'), savedRow('row-2', 'b', '2026-10-17T15:00:00Z')];
    expect(planHealthSync([], saved, NOW, { canRemove: true }).remove).toEqual([]);
  });

  it('never removes a workout saved for yesterday, gone or duplicate', () => {
    const gone = savedRow('row-gone', 'gone', '2026-10-16T14:00:00Z');
    // Yesterday's Whoop copy, now that the Watch's copy of the same walk is in Health too.
    const yWatch = workout('y-watch', '2026-10-16T16:00:00Z', { sourceId: 'com.apple.health.abc', route: line(2000) });
    const yWhoop = workout('y-whoop', '2026-10-16T16:02:00Z', { sourceId: 'com.whoop.iphone' });
    const dupes = [savedRow('row-watch', 'y-watch', '2026-10-16T16:00:00Z'), savedRow('row-whoop', 'y-whoop', '2026-10-16T16:02:00Z')];
    const plan = planHealthSync([watch, yWatch, yWhoop], [gone, ...dupes], NOW, { canRemove: true });
    expect(plan.remove).toEqual([]);
  });

  it('keeps a saved workout under five minutes and only stops new short ones', () => {
    const shortSaved = workout('short-saved', '2026-10-17T14:00:00Z', { durationSeconds: 120 });
    const shortNew = workout('short-new', '2026-10-17T15:00:00Z', { durationSeconds: 120 });
    const plan = planHealthSync([shortSaved, shortNew], [savedRow('row-short', 'short-saved', '2026-10-17T14:00:00Z', 2)], NOW, {
      canRemove: true,
    });
    expect(plan.remove).toEqual([]);
    expect(plan.fill.map((w) => w.uuid)).toEqual(['short-saved']);
    expect(plan.insert).toEqual([]);
    expect(plan.skipped).toBe(1);
  });

  it('skips a workout its owner removed from Arro', () => {
    expect(planHealthSync([watch], [], NOW, { dismissed: new Set(['watch']) }).insert).toEqual([]);
  });
});

describe('syncHealthWorkouts', () => {
  it('counts what was added, already there, filled in and skipped', async () => {
    // Inserts run oldest first: late, raced, new.
    insert
      .mockRejectedValueOnce(new WorkoutDateError('closed'))
      .mockResolvedValueOnce({ outcome: 'synced' })
      .mockResolvedValueOnce({ outcome: 'added', id: 'row-new' });
    fill.mockResolvedValueOnce(true);

    const result = await syncHealthWorkouts(
      'member-1',
      [
        workout('new', '2026-10-17T16:00:00Z'),
        workout('known', '2026-10-17T15:00:00Z', { route: line(2000) }),
        // Saved by another sync between reading the server and inserting.
        workout('raced', '2026-10-17T14:00:00Z'),
        workout('late', '2026-10-16T16:00:00Z'),
        workout('old', '2026-10-10T16:00:00Z'),
      ],
      [savedRow('row-known', 'known', '2026-10-17T15:00:00Z')],
      NOW,
    );

    expect(result).toEqual({
      added: 1,
      alreadySynced: 2,
      updated: 1,
      skipped: 2,
      addedWorkouts: [{ id: 'row-new', type: 'walk', sourceName: 'Health' }],
      replaced: 0,
      removed: 0,
    });
    expect(insert).toHaveBeenCalledTimes(3);
    expect(insert.mock.calls.find((c) => c[1].healthWorkoutId === 'new')?.[1]).toMatchObject({
      localDate: '2026-10-17',
      type: 'walk',
      minutes: 30,
    });
    expect(fill).toHaveBeenCalledWith('member-1', 'known', expect.objectContaining({ route: expect.any(String) }));
  });

  it('swaps in the better copy and removes rows gone from Health', async () => {
    const result = await syncHealthWorkouts(
      'member-1',
      [workout('watch', '2026-10-17T16:00:00Z', { sourceId: 'com.apple.health.abc', sourceName: 'Apple Watch' })],
      [savedRow('row-1', 'whoop', '2026-10-17T16:02:00Z'), savedRow('row-gone', 'gone', '2026-10-17T13:00:00Z')],
      NOW,
      { canRemove: true },
    );
    expect(result).toMatchObject({ added: 0, replaced: 1, removed: 1 });
    expect(replace).toHaveBeenCalledWith('row-1', expect.objectContaining({ healthWorkoutId: 'watch', sourceApp: 'Apple Watch' }));
    expect(remove).toHaveBeenCalledWith('row-gone');
  });

  it('passes on errors other than a closed day', async () => {
    insert.mockRejectedValueOnce(new Error('offline'));
    await expect(syncHealthWorkouts('member-1', [workout('new', '2026-10-17T16:00:00Z')], [], NOW)).rejects.toThrow(
      'offline',
    );
  });
});

describe('healthSourceLabel', () => {
  it('stores a fixed label, never the name Health gives a device', () => {
    expect(healthSourceLabel({ sourceId: 'com.apple.health.81A2', sourceName: 'Bryce’s Apple Watch' })).toBe('Apple Watch');
    expect(healthSourceLabel({ sourceId: 'com.apple.health.81A2', sourceName: 'Bryce’s iPhone' })).toBe('iPhone');
    expect(healthSourceLabel({ sourceId: 'com.apple.Fitness', sourceName: 'Fitness' })).toBe('Apple Health');
    expect(healthSourceLabel({ sourceId: 'com.whoop.iphone', sourceName: 'WHOOP' })).toBe('WHOOP');
    expect(healthSourceLabel({ sourceId: 'com.strava.stravaride', sourceName: 'Strava' })).toBe('Strava');
    expect(healthSourceLabel({ sourceId: 'com.garmin.connect.mobile', sourceName: 'Connect' })).toBe('Garmin');
    expect(healthSourceLabel({ sourceId: 'com.example.tracker', sourceName: 'Bryce’s Tracker' })).toBe('Health');
    expect(healthSourceLabel({})).toBe('Health');
  });
});
