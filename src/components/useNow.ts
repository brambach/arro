import { useEffect, useState } from 'react';

/**
 * The time, ticking on each whole second while `running`. The timer works its
 * numbers out from timestamps (src/state/timer.ts), so this only says when to
 * redraw: a paused tick (screen hidden, app in the background) loses nothing,
 * and the first tick after it catches straight up.
 */
export function useNow(running: boolean, everyMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!running) return;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = new Date();
      setNow(t);
      // Land just after the next whole second, so 12:39 turns to 12:40 on time.
      timeout = setTimeout(tick, everyMs - (t.getTime() % everyMs) + 8);
    };
    tick();
    return () => clearTimeout(timeout);
  }, [running, everyMs]);
  return now;
}
