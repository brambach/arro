// RevenueCat calls this for every purchase event (Saunafam Plus). It keeps
// public.family_plans in step: see handler.ts for the request and responses and
// ../_shared/plus.ts for the rules.
//
// Deploy with JWT checks off, because RevenueCat sends its own Authorization
// value, not a Supabase JWT: supabase/config.toml has
// [functions.revenuecat-webhook] verify_jwt = false, and by hand it's
//   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets: REVENUECAT_WEBHOOK_SECRET (the same value as the Authorization header
// set in the RevenueCat dashboard). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// come from the edge runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { supabasePlusStore } from '../_shared/plusSupabase.ts';
import { handleWebhook } from './handler.ts';

Deno.serve((req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  return handleWebhook(req, {
    secret: Deno.env.get('REVENUECAT_WEBHOOK_SECRET'),
    store: supabasePlusStore(db),
  });
});
