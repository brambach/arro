/**
 * The one-time Apple Health offer on Today: "Save sessions to Apple Health?"
 * after your first saved session, with Turn on and Not now. Either answer
 * puts it away for good. The answer is kept on the phone
 * (`saunafam.healthOffer.v1`); M11 reads `'on'` as the person saying yes and
 * does the actual write-only permission and saving (src/state/health.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HEALTH_OFFER_KEY = 'saunafam.healthOffer.v1';

export type HealthOfferAnswer = 'on' | 'notNow';

export const HEALTH_OFFER_COPY = {
  title: 'Save sessions to Apple Health?',
  body: 'Your heat minutes go into Health as Mindful Minutes. Saunafam never reads anything from Health.',
  turnOn: 'Turn on',
  notNow: 'Not now',
} as const;

/** Show it once you've saved a session (not one still waiting to send), until it's answered. */
export function healthOfferDue(input: { answer: HealthOfferAnswer | null; savedSessions: number; available: boolean }): boolean {
  return input.available && input.answer === null && input.savedSessions > 0;
}

export function parseHealthOffer(raw: string | null): HealthOfferAnswer | null {
  return raw === 'on' || raw === 'notNow' ? raw : null;
}

export async function loadHealthOffer(): Promise<HealthOfferAnswer | null> {
  try {
    return parseHealthOffer(await AsyncStorage.getItem(HEALTH_OFFER_KEY));
  } catch {
    return null;
  }
}

export async function saveHealthOffer(answer: HealthOfferAnswer): Promise<void> {
  await AsyncStorage.setItem(HEALTH_OFFER_KEY, answer);
}
