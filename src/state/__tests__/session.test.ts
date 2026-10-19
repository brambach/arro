import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCachedFamily } from '../session';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// What build 6 wrote under arro.family.v1: workouts without comments, no pauses.
const build6Family = {
  id: 'fam',
  name: 'Home crew',
  joinCode: 'K7P4QX9M',
  members: [],
  workouts: [
    {
      id: 'w1',
      memberId: 'me',
      localDate: '2026-10-12',
      type: 'walk',
      minutes: 30,
      source: 'manual',
      createdAt: '2026-10-12T14:00:00.000Z',
      cheeredBy: ['mum'],
    },
  ],
  streak: { current: 1, longest: 1, daysTogetherThisYear: 1, startedOn: '2026-10-12' },
  memberStreaks: {},
};

describe('loadCachedFamily', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('fills in the fields a family cached by build 6 lacks', async () => {
    await AsyncStorage.setItem('arro.family.v1', JSON.stringify(build6Family));
    const family = await loadCachedFamily();
    expect(family?.pauses).toEqual([]);
    expect(family?.workouts[0].comments).toEqual([]);
    expect(family?.workouts[0].cheeredBy).toEqual(['mum']);
    expect(family?.workouts[0].minutes).toBe(30);
  });

  it('defaults cheers too, for anything older', async () => {
    const { cheeredBy, ...noCheers } = build6Family.workouts[0];
    await AsyncStorage.setItem('arro.family.v1', JSON.stringify({ ...build6Family, workouts: [noCheers] }));
    const family = await loadCachedFamily();
    expect(family?.workouts[0].cheeredBy).toEqual([]);
  });

  it('keeps what a current build cached', async () => {
    const current = {
      ...build6Family,
      pauses: [{ memberId: 'me', startsOn: '2026-10-20', endsOn: '2026-10-22' }],
      workouts: [{ ...build6Family.workouts[0], comments: [{ id: 'c1', memberId: 'mum', body: 'Nice', createdAt: '2026-10-12T15:00:00.000Z' }] }],
    };
    await AsyncStorage.setItem('arro.family.v1', JSON.stringify(current));
    expect(await loadCachedFamily()).toEqual(current);
  });

  it('drops a cache that is not a family', async () => {
    await AsyncStorage.setItem('arro.family.v1', JSON.stringify({ id: 'fam' }));
    expect(await loadCachedFamily()).toBeNull();
  });
});
