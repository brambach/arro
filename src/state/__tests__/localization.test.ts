/**
 * °F or °C from expo-localization (SDK 57's `temperatureUnit`), with the region
 * rule when the phone doesn't say.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { deviceTemperatureUnit } from '../../data/saunas';

// jest.mock is hoisted above the imports, so saunas.ts sees this expo-localization.
const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));

const locale = (patch: object) => [{ languageTag: 'en-US', regionCode: 'US', temperatureUnit: null, ...patch }];

describe('deviceTemperatureUnit', () => {
  it('follows the phone’s own setting first', () => {
    mockGetLocales.mockReturnValue(locale({ temperatureUnit: 'celsius' }));
    expect(deviceTemperatureUnit()).toBe('C');
    mockGetLocales.mockReturnValue(locale({ languageTag: 'fi-FI', regionCode: 'FI', temperatureUnit: 'fahrenheit' }));
    expect(deviceTemperatureUnit()).toBe('F');
  });

  it('falls back to the region', () => {
    mockGetLocales.mockReturnValue(locale({}));
    expect(deviceTemperatureUnit()).toBe('F');
    mockGetLocales.mockReturnValue(locale({ languageTag: 'fi-FI', regionCode: 'FI' }));
    expect(deviceTemperatureUnit()).toBe('C');
    mockGetLocales.mockReturnValue(locale({ languageTag: 'en-LR', regionCode: null }));
    expect(deviceTemperatureUnit()).toBe('F');
  });

  it('falls back to Intl when expo-localization fails', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(['C', 'F']).toContain(deviceTemperatureUnit());
  });
});
