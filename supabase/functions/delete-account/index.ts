// Deletes the signed-in person's account (Settings > Delete account), in order:
//   1. every photo they uploaded, in every family they're in. Storage files aren't
//      removed with the database rows, and the privacy policy promises they go;
//   2. their Sign in with Apple token, revoked with Apple, when the app sent a fresh
//      authorization code and the Apple settings below are set (App Review
//      Guideline 5.1.1(v) expects this for apps that use Sign in with Apple);
//   3. the auth user, which cascades to their member rows, workouts, cheers, nudges
//      and push tokens, and to any family they leave empty.
//
// Called by the app with the person's own JWT; it only ever deletes that person.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the edge runtime.
// Optional, for revoking the Apple token (without them step 2 is skipped):
//   APPLE_TEAM_ID       the developer team id
//   APPLE_KEY_ID        the id of a Sign in with Apple key
//   APPLE_PRIVATE_KEY   that key's .p8 contents
//   APPLE_CLIENT_ID     the app's bundle id
import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

const BUCKET = 'photos';
// 100 files a round; 50 rounds is far more photos than one person uploads.
const PAGE = 100;
const MAX_ROUNDS = 50;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who, error: whoError } = await db.auth.getUser(jwt);
  if (whoError || !who.user) return Response.json({ error: 'sign in first' }, { status: 401 });
  const userId = who.user.id;
  const body = (await req.json().catch(() => ({}))) as { appleAuthorizationCode?: unknown };

  // 1. Photos -------------------------------------------------------------------
  const { data: memberships, error: membersError } = await db
    .from('members')
    .select('id, family_id')
    .eq('user_id', userId);
  if (membersError) return Response.json({ error: membersError.message }, { status: 500 });

  for (const m of memberships ?? []) {
    const folder = `${m.family_id}/${m.id}`;
    for (let round = 0; ; round++) {
      if (round === MAX_ROUNDS) return Response.json({ error: 'too many photos to remove' }, { status: 500 });
      const { data: files, error: listError } = await db.storage.from(BUCKET).list(folder, { limit: PAGE });
      if (listError) return Response.json({ error: listError.message }, { status: 500 });
      if (!files || files.length === 0) break;
      const { data: removed, error: removeError } = await db.storage
        .from(BUCKET)
        .remove(files.map((f) => `${folder}/${f.name}`));
      if (removeError) return Response.json({ error: removeError.message }, { status: 500 });
      // Nothing removed means the next list returns the same files: stop instead of looping.
      if (!removed || removed.length === 0) {
        return Response.json({ error: 'photos could not be removed' }, { status: 500 });
      }
    }
  }

  // 2. Apple --------------------------------------------------------------------
  // A failure here doesn't stop the deletion: the person asked to be deleted, and
  // Apple drops a token for an app that no longer has the user's account anyway.
  let appleRevoked = false;
  const code = typeof body.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  if (code && appleConfigured()) {
    try {
      await revokeAppleToken(code);
      appleRevoked = true;
    } catch (e) {
      console.error('Apple token revoke failed', e instanceof Error ? e.message : e);
    }
  }

  // 3. The account ----------------------------------------------------------------
  const { error: deleteError } = await db.auth.admin.deleteUser(userId);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  return Response.json({ deleted: true, appleRevoked });
});

function appleConfigured(): boolean {
  return ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_CLIENT_ID'].every((k) => !!Deno.env.get(k));
}

/** The short-lived client secret Apple's REST API takes: an ES256 JWT signed with the .p8 key. */
async function appleClientSecret(): Promise<string> {
  const pem = Deno.env.get('APPLE_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  const key = await importPKCS8(pem, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: Deno.env.get('APPLE_KEY_ID')! })
    .setIssuer(Deno.env.get('APPLE_TEAM_ID')!)
    .setSubject(Deno.env.get('APPLE_CLIENT_ID')!)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

/** Swaps the app's fresh authorization code for a token, then revokes it. */
async function revokeAppleToken(authorizationCode: string): Promise<void> {
  const clientId = Deno.env.get('APPLE_CLIENT_ID')!;
  const clientSecret = await appleClientSecret();
  const form = { 'Content-Type': 'application/x-www-form-urlencoded' };

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: form,
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange: ${tokenRes.status} ${await tokenRes.text()}`);
  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error('token exchange returned no token');

  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: form,
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }),
  });
  if (!revokeRes.ok) throw new Error(`revoke: ${revokeRes.status} ${await revokeRes.text()}`);
}
