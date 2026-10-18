-- Joining a family, after the 17 October review:
--   1. join_family is rate-limited like preview_invite, and the global cap only
--      counts signed-out callers, so a flood of bad guesses can't lock out
--      people who are signed in.
--   2. New join codes are eight characters.
--   3. A family has at most 12 people.
--   4. The person who started a family can remove someone from it.

-- 1. Guessing ------------------------------------------------------------------
-- Limits, counted over failed lookups only:
--   10 per caller per 15 minutes, and 200 per hour across signed-out callers.
-- A signed-in caller is keyed by their user id, which can't be forged, so they
-- only have their own limit. Signed-out callers are keyed by an IP header that
-- can be, so they also share the global cap.
create or replace function private.too_many_invite_attempts(p_caller text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select count(*) from private.invite_attempts a
           where a.caller = p_caller and a.attempted_at > now() - interval '15 minutes') >= 10
      or (p_caller like 'ip:%'
          and (select count(*) from private.invite_attempts a
                where a.caller like 'ip:%' and a.attempted_at > now() - interval '1 hour') >= 200);
$$;

create or replace function private.log_invite_attempt(p_caller text)
returns void
language sql
volatile
set search_path = ''
as $$
  delete from private.invite_attempts a where a.attempted_at < now() - interval '1 day';
  insert into private.invite_attempts (caller) values (p_caller);
$$;

revoke all on function private.too_many_invite_attempts(text) from public;
revoke all on function private.log_invite_attempt(text) from public;

-- Same as before apart from the limit check, which now uses the helpers above.
create or replace function public.preview_invite(p_code text)
returns table (
  family_name text,
  member_count integer,
  invited_by_name text,
  member_names text[],
  member_colours text[],
  member_photo_paths text[],
  family_streak integer,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  inv public.invites;
  v_caller text := private.invite_caller();
  signed_in boolean := auth.uid() is not null;
begin
  if private.too_many_invite_attempts(v_caller) then
    raise exception 'too many attempts, try again later' using errcode = 'PT429';
  end if;

  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    perform private.log_invite_attempt(v_caller);
    return;
  end if;

  if not signed_in then
    return query
      select f.name,
             count(m.id)::integer,
             null::text,
             null::text[],
             null::text[],
             null::text[],
             null::integer,
             inv.expires_at
        from public.families f
        join public.members m on m.family_id = f.id
       where f.id = inv.family_id
       group by f.id, f.name;
    return;
  end if;

  return query
    select f.name,
           count(m.id)::integer,
           (select im.display_name from public.members im where im.id = inv.invited_by),
           array_agg(m.display_name order by m.joined_at),
           array_agg(m.colour order by m.joined_at),
           array_agg(m.photo_path order by m.joined_at),
           (select s.family_streak from private.family_summary(f.id, now()) s),
           inv.expires_at
      from public.families f
      join public.members m on m.family_id = f.id
     where f.id = inv.family_id
     group by f.id, f.name;
end;
$$;

-- 3. Family size ---------------------------------------------------------------
create or replace function private.max_family_size()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 12;
$$;

-- join_family now returns null for a wrong or expired code instead of raising,
-- because raising would roll back the logged attempt. Past the limit it raises
-- PT429, and for a full family AR409.
create or replace function public.join_family(
  p_code text,
  p_display_name text,
  p_timezone text,
  p_reminder_time time default null
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites;
  joined public.members;
  v_caller text := private.invite_caller();
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  if private.too_many_invite_attempts(v_caller) then
    raise exception 'too many attempts, try again later' using errcode = 'PT429';
  end if;

  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    perform private.log_invite_attempt(v_caller);
    return null;
  end if;

  -- Joining twice returns the existing member row.
  select * into joined from public.members m
   where m.family_id = inv.family_id and m.user_id = auth.uid();
  if found then
    return joined;
  end if;

  -- Serialise joins per family so two people never get the same colour, and the
  -- size check can't be raced.
  perform 1 from public.families f where f.id = inv.family_id for update;

  if (select count(*) from public.members m where m.family_id = inv.family_id) >= private.max_family_size() then
    raise exception 'that family is full' using errcode = 'AR409';
  end if;

  insert into public.members (family_id, user_id, display_name, colour, timezone, reminder_time)
  values (inv.family_id, auth.uid(), btrim(p_display_name), private.next_member_colour(inv.family_id),
          p_timezone, p_reminder_time)
  returning * into joined;

  return joined;
end;
$$;

revoke all on function private.max_family_size() from public;
revoke all on function public.join_family(text, text, text, time) from public, anon;
grant execute on function public.join_family(text, text, text, time) to authenticated;

-- 2. Eight-character codes -----------------------------------------------------
-- 31^8 is about 850 billion. Codes already sent keep working until they expire.
create or replace function private.new_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code_length constant integer := 8;
  candidate text;
  random_bytes bytea;
  i integer;
  b integer;
begin
  loop
    candidate := '';
    while length(candidate) < code_length loop
      random_bytes := extensions.gen_random_bytes(16);
      i := 0;
      while i < 16 and length(candidate) < code_length loop
        b := get_byte(random_bytes, i);
        i := i + 1;
        if b < 248 then
          candidate := candidate || substr(alphabet, 1 + b % 31, 1);
        end if;
      end loop;
    end loop;
    exit when not exists (select 1 from public.invites where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- 4. Removing someone ----------------------------------------------------------
-- The person who started the family is whoever has been in it longest. If they
-- delete their account, the next longest takes over.
create or replace function private.family_founder(p_family_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select m.user_id from public.members m
   where m.family_id = p_family_id
   order by m.joined_at, m.id
   limit 1;
$$;

-- Removes a member and, by cascade, their workouts, cheers and nudges. Every
-- invite for the family is withdrawn too, because the removed person knows the
-- current code; the app makes a new one on its next refresh. Their photos stay
-- in Storage, unreadable to them, until photo cleanup moves to an edge function.
--
-- Someone else's member id, or not being the founder, both give 42501, so the
-- call doesn't reveal whether a member id exists.
create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.members;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  select * into target from public.members m where m.id = p_member_id;
  if not found then
    raise exception 'only the person who started the family can remove someone' using errcode = '42501';
  end if;

  perform 1 from public.families f where f.id = target.family_id for update;

  if private.family_founder(target.family_id) is distinct from auth.uid() then
    raise exception 'only the person who started the family can remove someone' using errcode = '42501';
  end if;
  if target.user_id = auth.uid() then
    raise exception 'you can''t remove yourself' using errcode = '22023';
  end if;

  delete from public.members m where m.id = p_member_id;
  delete from public.invites i where i.family_id = target.family_id;
end;
$$;

revoke all on function private.family_founder(uuid) from public;
revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;
