import { beforeEach, describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FAMILY_KEY,
  SESSION_KEY,
  clearLegacyStorage,
  clearSession,
  loadCachedFamily,
  loadSession,
  normalizeSession,
  saveCachedFamily,
} from '../session';
import { previewFamily } from '../../data/preview';

// What build 8 wrote under arro.session.v1.
const build8Session = {
  version: 1,
  role: 'founder',
  me: {
    id: 'm1',
    name: 'Sam',
    color: '#4F97CF',
    photoUri: null,
    moveMethod: 'health',
    reminder: 'morning',
    remindersWanted: true,
    joinedOn: '2026-10-01',
  },
  family: { name: 'Sunday sauna', joinCode: '', invited: [{ id: 'i1', name: 'Jo' }] },
  workouts: [{ id: 'w1', localDate: '2026-10-12', loggedAt: '2026-10-12T14:00:00.000Z', type: 'walk' }],
  remote: { userId: 'u1', memberId: 'm1', familyId: 'f1' },
  photos: { w1: 'file:///w1.jpg' },
  dismissedHealth: ['abc'],
};

// What build 8 wrote under arro.family.v1.
const build8Family = { id: 'f1', name: 'Sunday sauna', joinCode: 'K7P4QX9M', members: [], workouts: [], streak: {}, memberStreaks: {} };

describe('stored data on the phone', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps a build 8 tester signed in: their session reads in today’s shape', async () => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(build8Session));
    const s = await loadSession();
    expect(s?.remote).toEqual({ userId: 'u1', memberId: 'm1', familyId: 'f1' });
    expect(s?.me).toEqual({
      id: 'm1',
      name: 'Sam',
      color: '#4F97CF',
      photoUri: null,
      reminderDays: [4, 6],
      reminderTime: '08:00',
      remindersWanted: true,
      joinedOn: '2026-10-01',
    });
    expect(s?.family.invited).toEqual([{ id: 'i1', name: 'Jo' }]);
    expect(s && 'workouts' in s).toBe(false);
    expect(s && 'dismissedHealth' in s).toBe(false);
  });

  it('rejects anything that isn’t a session', () => {
    expect(normalizeSession(null)).toBeNull();
    expect(normalizeSession({ version: 2 })).toBeNull();
    expect(normalizeSession({ version: 1, me: {} })).toBeNull();
  });

  it('caches the family under arro.family.v2 and reads it back', async () => {
    const family = previewFamily(new Date(2026, 9, 22, 16, 10));
    await saveCachedFamily(family);
    expect(await AsyncStorage.getItem(FAMILY_KEY)).not.toBeNull();
    expect(await loadCachedFamily()).toEqual(family);
  });

  it('never reads Arro’s family shape as a cached family', async () => {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(build8Family));
    expect(await loadCachedFamily()).toBeNull();
  });

  it('deletes arro.family.v1 and arro.moveMethod.v1, and keeps arro.session.v1 and the Supabase login', async () => {
    await AsyncStorage.multiSet([
      ['arro.family.v1', JSON.stringify(build8Family)],
      ['arro.moveMethod.v1', 'health'],
      [SESSION_KEY, JSON.stringify(build8Session)],
      ['sb-project-auth-token', '{}'],
    ]);
    await clearLegacyStorage();
    const keys = await AsyncStorage.getAllKeys();
    expect([...keys].sort()).toEqual(['arro.session.v1', 'sb-project-auth-token']);
  });

  it('signing out clears the session and the cached family', async () => {
    await AsyncStorage.multiSet([
      [SESSION_KEY, JSON.stringify(build8Session)],
      [FAMILY_KEY, '{}'],
    ]);
    await clearSession();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
