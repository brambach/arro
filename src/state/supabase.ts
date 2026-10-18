/**
 * The Supabase client for the hosted `arro` project. Only the project URL and the
 * public anon key live in the app; row-level security keeps each family private.
 *
 * With no URL or key configured, `supabase` is null and the app runs on local
 * state as in phase 1 (web preview, Expo Go, the preview family). A release build
 * for a phone refuses to start that way instead (App.tsx, missingServerSettings).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * iOS sometimes hands back a pooled connection the server has already closed,
 * most often right after the app was in the background (Apple's sign-in sheet
 * does this), and the request fails with "The network connection was lost".
 * One immediate retry opens a fresh connection.
 *
 * Only for requests that are safe to send twice: reads, and the auth token call
 * (signing in again just makes another session). The same error can come after a
 * request was sent, so retrying a write could save a check-in twice.
 */
const fetchWithRetry: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (!isConnectionLost(e) || !safeToRepeat(input, init)) throw e;
    return fetch(input, init);
  }
};

function safeToRepeat(input: unknown, init?: RequestInit): boolean {
  // A URL string, a URL or a Request.
  const req = (typeof input === 'string' ? {} : input) as { method?: string; url?: string; href?: string };
  const method = (init?.method ?? req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;
  const href = typeof input === 'string' ? input : (req.url ?? req.href ?? '');
  return href.includes('/auth/v1/token');
}

function isConnectionLost(e: unknown): boolean {
  return e instanceof Error && /network connection was lost/i.test(e.message);
}

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // The login lives in its own AsyncStorage key, apart from arro.session.v1.
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
        global: { fetch: fetchWithRetry },
      })
    : null;

/**
 * A release build for a phone made without `.env.local`: it would quietly run on
 * this phone's local family and never reach the server, so App.tsx shows a notice
 * instead of the app.
 */
export const missingServerSettings = !supabase && !__DEV__ && Platform.OS !== 'web';

// Refresh the login only while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
