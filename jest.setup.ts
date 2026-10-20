import { jest } from '@jest/globals';

// Every suite gets the in-memory AsyncStorage, since state modules import it.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
