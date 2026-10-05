import { useEffect, useState } from 'react';
import { yesterdayOpen } from './dates';

/** Whether the server takes "yesterday" right now, checked each minute so it goes away when it closes. */
export function useYesterdayOpen(): boolean {
  const [open, setOpen] = useState(() => yesterdayOpen());
  useEffect(() => {
    const timer = setInterval(() => setOpen(yesterdayOpen()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return open;
}
