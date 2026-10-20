/**
 * Version 4 UUIDs made on the phone, for log_session's p_client_id. expo-crypto's
 * randomUUID (SDK 57, synchronous) where its native side exists; elsewhere (Jest,
 * a dev build made before it was added) a Math.random version of the same format,
 * which is fine for an idempotency key scoped to one person.
 */
import { requireOptionalNativeModule } from 'expo';

let native: (() => string) | null | undefined;

function nativeRandomUUID(): (() => string) | null {
  if (native !== undefined) return native;
  native = null;
  try {
    if (requireOptionalNativeModule('ExpoCrypto')) {
      // Loaded lazily so a build without the module never imports it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Crypto = require('expo-crypto') as typeof import('expo-crypto');
      native = () => Crypto.randomUUID();
    }
  } catch {
    native = null;
  }
  return native;
}

export function fallbackUUID(random: () => number = Math.random): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16));
  hex[12] = 4;
  hex[16] = (hex[16] & 0x3) | 0x8;
  const s = hex.map((n) => n.toString(16)).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export function uuid(): string {
  const make = nativeRandomUUID();
  if (make) {
    try {
      return make();
    } catch {
      // Fall through.
    }
  }
  return fallbackUUID();
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
