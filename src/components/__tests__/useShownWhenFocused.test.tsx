import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { SHEET_DISMISS_MS, useShownWhenFocused } from '../useShownWhenFocused';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));

function Probe({ value, out }: { value: { n: number }; out: { n: number }[] }) {
  out.push(useShownWhenFocused(value));
  return null;
}

describe('useShownWhenFocused', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
  });
  afterEach(() => jest.useRealTimers());

  it('passes changes through while the screen is in front', () => {
    const out: { n: number }[] = [];
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<Probe value={{ n: 1 }} out={out} />);
    });
    act(() => r?.update(<Probe value={{ n: 2 }} out={out} />));
    act(() => jest.advanceTimersByTime(1));
    expect(out[out.length - 1].n).toBe(2);
  });

  it('holds a change made while covered until the sheet has gone, even if the value keeps changing', () => {
    const out: { n: number }[] = [];
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<Probe value={{ n: 1 }} out={out} />);
    });
    mockFocused = false;
    act(() => r?.update(<Probe value={{ n: 2 }} out={out} />));
    act(() => jest.advanceTimersByTime(1000));
    expect(out[out.length - 1].n).toBe(1);
    mockFocused = true;
    act(() => r?.update(<Probe value={{ n: 2 }} out={out} />));
    act(() => jest.advanceTimersByTime(SHEET_DISMISS_MS / 2));
    // A rebuilt view arrives mid-hold: still held.
    act(() => r?.update(<Probe value={{ n: 3 }} out={out} />));
    act(() => jest.advanceTimersByTime(1));
    expect(out[out.length - 1].n).toBe(1);
    act(() => jest.advanceTimersByTime(SHEET_DISMISS_MS));
    expect(out[out.length - 1].n).toBe(3);
  });
});
