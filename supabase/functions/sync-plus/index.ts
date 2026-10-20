// Called by the app right after a purchase or restore (Saunafam Plus), so the
// family sees Plus without waiting for the webhook. See handler.ts for the
// request and responses.
// Secrets: REVENUECAT_SECRET_API_KEY (a RevenueCat secret key; it never leaves
// the server). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from the edge runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { RevenueCatSubscriberResponse } from '../_shared/plus.ts';
import { supabasePlusStore } from '../_shared/plusSupabase.ts';
import { handleSync } from './handler.ts';

const REVENUECAT_API = 'https://api.revenuecat.com/v1';

Deno.serve((req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');

  return handleSync(req, {
    store: supabasePlusStore(db),
    async userIdFromJwt(jwt) {
      const { data, error } = await db.auth.getUser(jwt);
      return error || !data.user ? null : data.user.id;
    },
    async fetchSubscriber(appUserId) {
      if (!apiKey) throw new Error('REVENUECAT_SECRET_API_KEY is not set');
      // Get or create: RevenueCat answers 201 with an empty record for someone it
      // hasn't seen, which reads as no purchase.
      const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`RevenueCat answered ${res.status}`);
      return (await res.json()) as RevenueCatSubscriberResponse;
    },
  });
});
