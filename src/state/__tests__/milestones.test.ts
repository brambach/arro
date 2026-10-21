import { describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MILESTONES_KEY, badges, dueMilestone, loadMilestones, markShown, parseMilestones, reached, saveMilestones } from '../milestones';

describe('milestones', () => {
  it('fire at 4, 8, 12, 26 and 52 weeks', () => {
    expect([3, 4, 7, 8, 12, 25, 26, 51, 52, 80].map(reached)).toEqual([null, 4, 4, 8, 12, 12, 26, 26, 52, 52]);
  });

  it('family first, then personal, each once', () => {
    let memory = {};
    const streaks = { family: 4, personal: 4 };
    const first = dueMilestone(memory, 'sam', streaks);
    expect(first).toEqual({ kind: 'family', weeks: 4 });
    memory = markShown(memory, 'sam', first as NonNullable<typeof first>);
    const second = dueMilestone(memory, 'sam', streaks);
    expect(second).toEqual({ kind: 'personal', weeks: 4 });
    memory = markShown(memory, 'sam', second as NonNullable<typeof second>);
    expect(dueMilestone(memory, 'sam', streaks)).toBeNull();
  });

  it('only the highest reached shows, and the lower ones are filed away with it', () => {
    const memory = markShown({}, 'sam', { kind: 'family', weeks: 8 });
    expect(memory.sam.family).toEqual([4, 8]);
    expect(dueMilestone(memory, 'sam', { family: 9, personal: 0 })).toBeNull();
    expect(dueMilestone(memory, 'sam', { family: 12, personal: 0 })).toEqual({ kind: 'family', weeks: 12 });
  });

  it('a streak that breaks and climbs back doesn’t show the same one again', () => {
    const memory = markShown({}, 'sam', { kind: 'family', weeks: 4 });
    expect(dueMilestone(memory, 'sam', { family: 0, personal: 0 })).toBeNull();
    expect(dueMilestone(memory, 'sam', { family: 4, personal: 0 })).toBeNull();
  });

  it('is kept per member, so someone else on the same phone still sees theirs', () => {
    const memory = markShown({}, 'sam', { kind: 'family', weeks: 4 });
    expect(dueMilestone(memory, 'maya', { family: 4, personal: 0 })).toEqual({ kind: 'family', weeks: 4 });
  });

  it('nothing under 4', () => {
    expect(dueMilestone({}, 'sam', { family: 3, personal: 3 })).toBeNull();
  });

  it('stores and reads back, ignoring junk', async () => {
    await saveMilestones({ sam: { family: [4], personal: [] } });
    expect(await loadMilestones()).toEqual({ sam: { family: [4], personal: [] } });
    await AsyncStorage.setItem(MILESTONES_KEY, '{bad');
    expect(await loadMilestones()).toEqual({});
    expect(parseMilestones(JSON.stringify({ sam: { family: ['x', 8] } }))).toEqual({ sam: { family: [8], personal: [] } });
  });

  it('badges on Me follow the longest personal streak', () => {
    expect(badges(9)).toEqual([
      { weeks: 4, earned: true },
      { weeks: 8, earned: true },
      { weeks: 12, earned: false },
      { weeks: 26, earned: false },
      { weeks: 52, earned: false },
    ]);
  });
});
