import { describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HEALTH_OFFER_KEY, healthOfferDue, loadHealthOffer, parseHealthOffer, saveHealthOffer } from '../healthOffer';

describe('the Apple Health offer', () => {
  it('shows after the first saved session, until it’s answered', () => {
    expect(healthOfferDue({ answer: null, savedSessions: 0, available: true })).toBe(false);
    expect(healthOfferDue({ answer: null, savedSessions: 1, available: true })).toBe(true);
    expect(healthOfferDue({ answer: 'notNow', savedSessions: 4, available: true })).toBe(false);
    expect(healthOfferDue({ answer: 'on', savedSessions: 4, available: true })).toBe(false);
    // No Health on this device (iPad, web): never.
    expect(healthOfferDue({ answer: null, savedSessions: 4, available: false })).toBe(false);
  });

  it('remembers the answer on the phone', async () => {
    expect(await loadHealthOffer()).toBeNull();
    await saveHealthOffer('notNow');
    expect(await AsyncStorage.getItem(HEALTH_OFFER_KEY)).toBe('notNow');
    expect(await loadHealthOffer()).toBe('notNow');
    expect(parseHealthOffer('maybe')).toBeNull();
  });
});
