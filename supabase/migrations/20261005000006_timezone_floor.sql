-- Closes the timezone loophole in the today-or-yesterday workout rule.
--
-- Migration 5 measured "yesterday" in the member's own timezone. A member can set
-- that timezone to anything (the column is theirs to update, and join_family takes
-- it from the client too), so picking one far behind their real one pushed
-- "yesterday" back by up to a day or two. That defeated the no-backdating decision.
--
-- The server can't know where someone really is, so no rule that trusts the
-- timezone can hold. The fix is a floor that doesn't use it: a workout can't be
-- dated before yesterday in UTC, whatever timezone the member claims. The
-- timezone list the schema already checks against only runs from UTC-12 to UTC+14,
-- so bounding by that range would change nothing; the floor has to come from UTC.
--
-- What it costs: a member west of UTC can't log "yesterday" during the hours when
-- their local date is already behind the UTC date (about 7pm to midnight in New
-- York, about 5pm to midnight in Los Angeles, from 2pm in Hawaii). Today is never
-- affected. What's left: a member east of UTC who claims a timezone behind theirs
-- can still reach one day further than their real yesterday for part of the day.
-- Closing that needs a trusted source of location, which a database doesn't have.
--
-- Not done on purpose: limiting how often timezone can change. A member who joins
-- with the wrong timezone, or sets it once and leaves it, gets the same reach, so a
-- cooldown wouldn't hold anything the floor doesn't.

-- The window of dates a workout may carry, for a given moment and timezone. Time
-- is a parameter so tests can pin it.
create or replace function private.workout_date_window(p_now timestamptz, p_timezone text)
returns table (earliest date, latest date)
language sql
stable
set search_path = ''
as $$
  select greatest((p_now at time zone p_timezone)::date - 1, (p_now at time zone 'UTC')::date - 1),
         (p_now at time zone p_timezone)::date;
$$;

revoke all on function private.workout_date_window(timestamptz, text) from public;

-- Same behaviour as migration 5 (inserts, and updates that change local_date),
-- now using the window above.
create or replace function private.check_workout_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  win record;
begin
  if tg_op = 'UPDATE' and new.local_date = old.local_date then
    return new;
  end if;

  select w.earliest, w.latest into win
    from public.members m, private.workout_date_window(now(), m.timezone) w
   where m.id = new.member_id;
  -- No such member: the foreign key reports that.
  if win.latest is null then
    return new;
  end if;

  if new.local_date > win.latest then
    raise exception 'local_date % is after the member''s today (%)', new.local_date, win.latest
      using errcode = '22023';
  end if;
  if new.local_date < win.earliest then
    raise exception 'local_date % is older than %; workouts can only be logged for today or yesterday',
      new.local_date, win.earliest
      using errcode = '22023';
  end if;
  return new;
end;
$$;
