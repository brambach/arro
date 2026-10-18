// Removes someone from the family (Family members, touch and hold a name), then
// deletes their photos. Removing the member row doesn't touch Storage, and the
// family folder stays readable to everyone left in it, so the photos go here.
//
// The remove_member RPC runs as the caller, so the database decides who may remove
// whom (only the person who started the family). Photos are only deleted after it
// succeeds, with the service role, and only from the removed member's own folder.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY come from the edge runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { removePhotoFolder } from '../_shared/photos.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

  const authorization = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: who, error: whoError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (whoError || !who.user) return Response.json({ error: 'sign in first' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { memberId?: unknown };
  const memberId = typeof body.memberId === 'string' ? body.memberId : null;
  if (!memberId) return Response.json({ error: 'memberId is required' }, { status: 400 });

  // Read before the row goes, for the folder name.
  const { data: target, error: targetError } = await admin
    .from('members')
    .select('id, family_id')
    .eq('id', memberId)
    .maybeSingle();
  if (targetError) return Response.json({ error: targetError.message }, { status: 500 });

  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { error: rpcError } = await asCaller.rpc('remove_member', { p_member_id: memberId });
  if (rpcError) {
    const status = rpcError.code === '42501' ? 403 : 500;
    return Response.json({ error: rpcError.message, code: rpcError.code }, { status });
  }

  // remove_member succeeded, so the target existed and was in the caller's family.
  const photoError = target ? await removePhotoFolder(admin, `${target.family_id}/${target.id}`) : null;
  if (photoError) {
    // The member is already removed; say so, so the app doesn't offer to try again.
    console.error('remove-member photos', photoError);
    return Response.json({ removed: true, photosRemoved: false });
  }
  return Response.json({ removed: true, photosRemoved: true });
});
