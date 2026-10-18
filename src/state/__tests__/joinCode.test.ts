import { describe, expect, it } from '@jest/globals';
import { makeJoinCode } from '../joinCode';

describe('makeJoinCode', () => {
  it('uses the server’s alphabet: 8 characters, no 0, O, 1, I or L', () => {
    for (let i = 0; i < 500; i++) expect(makeJoinCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });
});
