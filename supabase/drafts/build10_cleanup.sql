-- DRAFT for build 10. Not a migration: it lives outside supabase/migrations so
-- nothing applies it. When build 10 ships, copy it into a new migration
-- (YYYYMMDDNNNNNN_build10_cleanup.sql), once no tester is left on build 8.
--
-- Drops what Arro used and Saunafam doesn't: workouts, cheers, comments, the
-- daily streak functions, Arro's push functions and phrases, and the old push
-- kinds. Checked locally on 20 Oct 2026 by running it inside a transaction
-- that was rolled back, after all six build 9 migrations.
--
-- BEFORE running this, delete the old workout photos with the service role.
-- They're in the same member folders as profile and session photos, so the
-- folders can't be emptied. Delete exactly the paths still on workouts, which
-- this file drops:
--
--   select photo_path from public.workouts where photo_path is not null;
--
-- then, with the service role (a one-off Deno script, using the client from
-- supabase/functions/_shared/photos.ts):
--
--   await db.storage.from('photos').remove(paths);   // up to 1000 per call
--
-- Photos of members who already left were removed by remove-member and
-- delete-account. A workout photo that's no longer in workouts (the app
-- replaced or removed it) can't be told apart from a profile or session photo
-- by its path, so it stays.

begin;

-- 1. preview_invite stops using the daily streak. Same columns as build 9, so
--    build 9 and 10 both read it; family_streak now carries the weekly number,
--    the same as week_streak.
create or replace function public.preview_invite(p_code text)
returns table (
  family_name text,
  member_count integer,
  invited_by_name text,
  member_names text[],
  member_colours text[],
  member_photo_paths text[],
  family_streak integer,
  expires_at timestamptz,
  week_streak integer,
  goal_per_week integer,
  min_minutes integer
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
      select f.name, count(m.id)::integer, null::text, null::text[], null::text[], null::text[],
             null::integer, inv.expires_at, null::integer, null::integer, null::integer
        from public.families f
        join public.members m on m.family_id = f.id
       where f.id = inv.family_id
       group by f.id, f.name;
    return;
  end if;

  return query
    with s as (select ws.family_streak from private.family_week_summary(inv.family_id, now()) ws)
    select f.name,
           count(m.id)::integer,
           (select im.display_name from public.members im where im.id = inv.invited_by),
           array_agg(m.display_name order by m.joined_at),
           array_agg(m.colour order by m.joined_at),
           array_agg(m.photo_path order by m.joined_at),
           (select s.family_streak from s),
           inv.expires_at,
           (select s.family_streak from s),
           f.goal_per_week::integer,
           f.min_minutes::integer
      from public.families f
      join public.members m on m.family_id = f.id
     where f.id = inv.family_id
     group by f.id, f.name;
end;
$$;

-- 2. Arro's tables. Their triggers, policies and indexes go with them.
drop table public.comments;
drop table public.cheers;
drop table public.workouts;

-- 3. Arro's functions.
drop function public.family_streak(uuid);
drop function public.member_streaks(uuid);
drop function private.family_summary(uuid, timestamptz);
drop function private.member_summary(uuid, timestamptz);
drop function private.family_days(uuid, timestamptz);
drop function private.member_days(uuid, timestamptz);
drop function private.freeze_refill_days();
drop function private.check_workout_date();
drop function private.queue_moved_push();
drop function private.queue_cheer_push();
drop function private.queue_comment_push();
drop function private.check_comment_rate();
drop function private.workout_noun(text);
drop function private.moved_phrase(text);
drop function private.queue_evening_nudges(timestamptz);
drop function private.run_evening_nudges();
drop function private.still_has_today_title(text[]);

-- 4. The old push kinds. Anything still queued of those kinds is past its hour
--    and would be dropped by claim_push_batch anyway.
delete from private.push_outbox where kind in ('cheer', 'evening', 'moved', 'comment');
drop index private.push_outbox_one_evening_a_day;
drop index private.push_outbox_one_moved_a_day;
drop index private.push_outbox_one_cheer_each;

alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in (
    'joined', 'nudge', 'session', 'shared', 'weekend', 'session_cheer', 'session_comment'));
alter table private.push_outbox drop constraint push_outbox_local_date;
alter table private.push_outbox
  add constraint push_outbox_local_date check ((kind in ('session', 'weekend')) = (local_date is not null));

-- Kept on purpose: private.workout_date_window (sessions use it), pauses,
-- nudges, family_plans, and the arro-evening-nudge schedule is already gone
-- (20261021000005).

commit;
