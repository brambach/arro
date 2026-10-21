import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

/**
 * Dev builds only, mounted with the DevDriver: a frame counter for the M16
 * self-review, reading the same two things as React Native's Perf Monitor (UI
 * thread and JS thread frames per second), but logged to Metro so the numbers
 * can be quoted exactly instead of read off a graph.
 *
 * The driver sends `{ op: 'emitArg', event: 'devFps', arg: 'start:door' }`, then
 * `arg: 'stop'`, and Metro prints one line:
 *
 *   [fps] door 1.84 s | ui 59.8 fps, longest gap 25 ms, 1 dropped | js 58.1 fps, longest gap 50 ms, 3 dropped
 *
 * UI frames come from Reanimated's frame callback (the UI thread's display
 * link), JS frames from requestAnimationFrame. "Dropped" counts the 60 Hz
 * frames each gap skipped.
 */
const FRAME_MS = 1000 / 60;

export function FpsProbe() {
  const uiFirst = useSharedValue(0);
  const uiLast = useSharedValue(0);
  const uiCount = useSharedValue(0);
  const uiLongest = useSharedValue(0);
  const uiDropped = useSharedValue(0);
  // [ms from the start, gap ms] for each gap that skipped a frame.
  const uiGaps = useSharedValue<number[][]>([]);

  const ui = useFrameCallback(({ timestamp }) => {
    if (uiCount.value > 0) {
      const gap = timestamp - uiLast.value;
      if (gap > uiLongest.value) uiLongest.value = gap;
      const skipped = Math.max(0, Math.round(gap / FRAME_MS) - 1);
      uiDropped.value += skipped;
      if (skipped > 0) uiGaps.value = [...uiGaps.value, [Math.round(uiLast.value - uiFirst.value), Math.round(gap)]];
    } else {
      uiFirst.value = timestamp;
    }
    uiLast.value = timestamp;
    uiCount.value += 1;
  }, false);

  const js = useRef<{ label: string; first: number; last: number; count: number; longest: number; dropped: number; raf: number; gaps: number[][] } | null>(null);

  useEffect(() => {
    const stopJs = () => {
      if (js.current) cancelAnimationFrame(js.current.raf);
    };
    const sub = DeviceEventEmitter.addListener('devFps', (arg: string) => {
      if (arg.startsWith('start:')) {
        stopJs();
        uiCount.set(0);
        uiLongest.set(0);
        uiDropped.set(0);
        uiGaps.set([]);
        ui.setActive(true);
        const s = { label: arg.slice(6), first: 0, last: 0, count: 0, longest: 0, dropped: 0, raf: 0, gaps: [] as number[][] };
        const step = (t: number) => {
          if (s.count > 0) {
            const gap = t - s.last;
            s.longest = Math.max(s.longest, gap);
            const skipped = Math.max(0, Math.round(gap / FRAME_MS) - 1);
            s.dropped += skipped;
            if (skipped > 0) s.gaps.push([Math.round(s.last - s.first), Math.round(gap)]);
          } else {
            s.first = t;
          }
          s.last = t;
          s.count += 1;
          s.raf = requestAnimationFrame(step);
        };
        s.raf = requestAnimationFrame(step);
        js.current = s;
      } else if (arg === 'stop' && js.current) {
        stopJs();
        ui.setActive(false);
        const s = js.current;
        js.current = null;
        const fps = (count: number, ms: number) => (ms > 0 ? ((count - 1) * 1000) / ms : 0).toFixed(1);
        const uiMs = uiLast.get() - uiFirst.get();
        console.log(
          `[fps] ${s.label} ${(uiMs / 1000).toFixed(2)} s | ui ${fps(uiCount.get(), uiMs)} fps, longest gap ${Math.round(uiLongest.get())} ms, ${uiDropped.get()} dropped` +
            ` | js ${fps(s.count, s.last - s.first)} fps, longest gap ${Math.round(s.longest)} ms, ${s.dropped} dropped`,
        );
        const at = (g: number[][]) => g.map(([t, ms]) => `${t}+${ms}`).join(' ') || 'none';
        console.log(`[fps] ${s.label} gaps (ms in, ms long): ui ${at(uiGaps.get())} | js ${at(s.gaps)}`);
      }
    });
    return () => {
      sub.remove();
      stopJs();
    };
  }, [ui, uiCount, uiDropped, uiFirst, uiGaps, uiLast, uiLongest]);

  return null;
}
