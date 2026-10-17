/**
 * The Supabase client for the hosted `arro` project. Only the project URL and the
 * public anon key live in the app; row-level security keeps each family private.
 *
 * With no URL or key configured, `supabase` is null and the app runs on local
 * state as in phase 1 (web preview, Expo Go, the preview family).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * iOS sometimes hands back a pooled connection the server has already closed,
 * most often right after the app was in the background (Apple's sign-in sheet
 * does this), and the request fails with "The network connection was lost"
 * before it is sent. One immediate retry opens a fresh connection.
 */
const fetchWithRetry: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (!isConnectionLost(e)) throw e;
    return fetch(input, init);
  }
};

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

// Refresh the login only while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
