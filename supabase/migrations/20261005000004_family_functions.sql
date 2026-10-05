-- Starting a family, joining one with a code, and deleting an account. These run
-- as the database owner because a person isn't a member yet when they call the
-- first two, so row-level security has nothing to let them through on.

-- First unused palette colour in join order, wrapping once all six are taken.
create or replace function private.next_member_colour(p_family_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select c from unnest(private.member_palette()) with ordinality as p (c, n)
      where c not in (select colour from public.members where family_id = p_family_id)
      order by n limit 1),
    (private.member_palette())[
      1 + (select count(*) from public.members where family_id = p_family_id)::integer
        % array_length(private.member_palette(), 1)
    ]
  );
$$;

create or replace function public.create_family(
  p_family_name text,
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
  new_family public.families;
  founder public.members;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  insert into public.families (name) values (btrim(p_family_name)) returning * into new_family;

  insert into public.members (family_id, user_id, display_name, colour, timezone, reminder_time)
  values (new_family.id, auth.uid(), btrim(p_display_name), private.next_member_colour(new_family.id),
          p_timezone, p_reminder_time)
  returning * into founder;

  return founder;
end;
$$;

-- What the invitee sees before signing in: "Bryce invited you to join <family>",
-- the members' faces and the family streak. Only for a code that hasn't expired.
create or replace function public.preview_invite(p_code text)
returns table (
  family_name text,
  invited_by_name text,
  member_names text[],
  member_colours text[],
  member_photo_paths text[],
  family_streak integer,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    return;
  end if;

  return query
    select f.name,
           (select m.display_name from public.members m where m.id = inv.invited_by),
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
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    raise exception 'that code has expired or doesn''t exist' using errcode = 'P0002';
  end if;

  -- Joining twice returns the existing member row.
  select * into joined from public.members m
   where m.family_id = inv.family_id and m.user_id = auth.uid();
  if found then
    return joined;
  end if;

  -- Serialise joins per family so two people never get the same colour.
  perform 1 from public.families f where f.id = inv.family_id for update;

  insert into public.members (family_id, user_id, display_name, colour, timezone, reminder_time)
  values (inv.family_id, auth.uid(), btrim(p_display_name), private.next_member_colour(inv.family_id),
          p_timezone, p_reminder_time)
  returning * into joined;

  return joined;
end;
$$;

-- In-app account deletion (App Store requirement). Removing the auth user
-- cascades to every member row, workout, cheer and nudge of theirs, and to any
-- family they leave empty. Photos in Storage need deleting separately once
-- buckets exist.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function private.next_member_colour(uuid) from public;
revoke all on function public.create_family(text, text, text, time) from public, anon;
revoke all on function public.join_family(text, text, text, time) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.preview_invite(text) from public;
grant execute on function public.create_family(text, text, text, time) to authenticated;
grant execute on function public.join_family(text, text, text, time) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
-- The invitee may not have signed in yet when they open the link.
grant execute on function public.preview_invite(text) to anon, authenticated;
