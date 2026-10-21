/**
 * Dev builds only: a tiny command bus for simulator captures, so screenshots
 * and recordings can be driven from the Mac without taps:
 *
 *   xcrun simctl openurl <udid> "com.arrofamily.arro://dev/start"
 *
 * `DevCapture` (src/dev/DevCapture.tsx) turns those links into commands.
 * Screens listen with onDevCommand. In a release build `__DEV__` is false, so
 * nothing subscribes and nothing is sent.
 */
type Listener = (command: string, args: Record<string, string>) => void;

const listeners = new Set<Listener>();

export function onDevCommand(listener: Listener): () => void {
  if (!__DEV__) return () => undefined;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function sendDevCommand(command: string, args: Record<string, string> = {}): void {
  if (!__DEV__) return;
  for (const l of [...listeners]) l(command, args);
}
