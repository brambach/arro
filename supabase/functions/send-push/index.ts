// Sends queued pushes (cheers, joins) through Expo's push service.
//
// The queue lives in private.push_outbox, filled by database triggers. The app
// calls this function after it cheers or joins, with the signed-in user's JWT.
// Calling it only sends what's already queued, so any signed-in caller is fine.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the edge runtime.
// EXPO_ACCESS_TOKEN is optional: set it only if push security is turned on in
// the Expo project.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';
// Expo takes at most 100 messages per request.
const BATCH = 100;
// Enough for a family's evening; anything left is picked up by the next call.
const MAX_ROUNDS = 5;

interface QueuedPush {
  outbox_id: number;
  token: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

  let sent = 0;
  let failed = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await db.rpc('claim_push_batch', { p_limit: BATCH });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const pushes = (data ?? []) as QueuedPush[];
    if (pushes.length === 0) break;

    // One outbox row can fan out to several phones, so a claim can return more than 100.
    for (let i = 0; i < pushes.length; i += BATCH) {
      const chunk = pushes.slice(i, i + BATCH);
      const res = await fetch(EXPO_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          chunk.map((p) => ({ to: p.token, title: p.title, body: p.body, data: p.data, sound: 'default' })),
        ),
      });
      if (!res.ok) {
        // Claimed rows stay marked sent: a retry storm is worse than a missed cheer.
        failed += chunk.length;
        console.error('Expo push send failed', res.status, await res.text());
        continue;
      }
      const tickets = ((await res.json()) as { data?: ExpoTicket[] }).data ?? [];
      const gone: string[] = [];
      tickets.forEach((t, j) => {
        if (t.status === 'ok') sent += 1;
        else {
          failed += 1;
          if (t.details?.error === 'DeviceNotRegistered') gone.push(chunk[j].token);
          else console.error('Expo push ticket error', t.message);
        }
      });
      if (gone.length > 0) await db.rpc('forget_push_tokens', { p_tokens: gone });
    }
  }

  return Response.json({ sent, failed });
});
