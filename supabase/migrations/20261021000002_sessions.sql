-- Saunafam build 9, part 2: sauna sessions.
--   * One row per person per session. A shared session (2 to 4 people) is one row
--     each, tied together by shared_id, which is the logger's row id (the anchor).
--   * local_date is set by trigger from started_at in each member's own time zone,
--     and must fall in the same today-or-yesterday window as Arro's workouts.
--   * Inserts only go through log_session, which is idempotent on the client_id
--     the phone makes, so the offline outbox can retry without double logging.
--   * Clients may update note and photo_path on their own anchor or solo rows;
--     everything else goes through update_session. "Remove me" is a plain delete
--     of your own row; the logger deletes the whole group with delete_session.
-- The workouts table stays for build 8 until build 10 drops it.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- The anchor's id when shared (the anchor points at itself); null when solo.
  shared_id uuid references public.sessions (id) on delete set null,
  -- Who logged it. Equal to member_id on solo and anchor rows.
  logged_by uuid references public.members (id) on delete set null,
  started_at timestamptz not null,
  -- Set by trigger from started_at in the member's time zone.
  local_date date not null,
  duration_minutes smallint not null check (duration_minutes between 1 and 240),
  rounds smallint not null default 1 check (rounds between 1 and 10),
  sauna_type text not null
    check (sauna_type in ('traditional', 'wood_fired', 'infrared', 'steam', 'smoke', 'banya', 'other')),
  temp_c numeric(4, 1) check (temp_c between 30 and 130),
  humidity_pct smallint check (humidity_pct between 0 and 100),
  cold_plunge boolean not null default false,
  cold_minutes smallint check (cold_minutes between 0 and 30),
  place text check (char_length(btrim(place)) between 1 and 60),
  note text check (char_length(note) <= 140),
  -- Storage path, only on an anchor or a solo session.
  photo_path text,
  source text not null check (source in ('timer', 'manual')),
  -- Made on the phone. Participants' rows reuse the logger's.
  client_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cold_plunge or cold_minutes is null)
);

create index sessions_member_date_idx on public.sessions (member_id, local_date);
create index sessions_shared_id_idx on public.sessions (shared_id);
create index sessions_logged_by_idx on public.sessions (logged_by);
-- One logged session per client_id, so a retry can't double log. Only rows a
-- person logged for themselves (solo and anchor rows), since participants reuse
-- the logger's client_id. The spec words this as "shared_id is null or
-- shared_id = id"; logged_by = member_id picks the same rows, and stays true
-- while a cascade is half done (removing a logger sets the participants'
-- shared_id and logged_by to null in separate steps, and the shared_id test
-- would briefly see two rows with the same key).
create unique index sessions_one_per_client_id
  on public.sessions (logged_by, client_id) where logged_by = member_id;

-- Triggers -------------------------------------------------------------------------
-- Named so they run in this order: date first, then the window check.
create or replace function private.set_session_local_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select (new.started_at at time zone m.timezone)::date into new.local_date
    from public.members m where m.id = new.member_id;
  return new;
end;
$$;

create trigger sessions_10_set_local_date
before insert or update of started_at, member_id on public.sessions
for each row execute function private.set_session_local_date();

-- Today or yesterday only, using the same window as workouts
-- (private.workout_date_window, 20261005000006). Updates are only checked when
-- local_date changes, so editing the note of an older session still works.
create or replace function private.check_session_date()
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
    raise exception 'session date % is after the member''s today (%)', new.local_date, win.latest
      using errcode = '22023';
  end if;
  if new.local_date < win.earliest then
    raise exception 'session date % is older than %; sessions can only be logged for today or yesterday',
      new.local_date, win.earliest
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger sessions_20_check_date
before insert or update on public.sessions
for each row execute function private.check_session_date();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sessions_30_touch_updated_at
before update on public.sessions
for each row execute function private.touch_updated_at();

-- When the last other person leaves a shared session, the anchor becomes a solo
-- session again, so the feed doesn't show "had a sauna together" for one person.
create or replace function private.unshare_lonely_anchor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.shared_id is not null and old.shared_id <> old.id
     and not exists (
       select 1 from public.sessions s where s.shared_id = old.shared_id and s.id <> old.shared_id) then
    update public.sessions set shared_id = null where id = old.shared_id and shared_id = id;
  end if;
  return null;
end;
$$;

create trigger sessions_unshare_lonely_anchor
after delete on public.sessions
for each row execute function private.unshare_lonely_anchor();

revoke all on function private.set_session_local_date() from public;
revoke all on function private.check_session_date() from public;
revoke all on function private.touch_updated_at() from public;
revoke all on function private.unshare_lonely_anchor() from public;

-- Row-level security ------------------------------------------------------------------
alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;
grant select, delete on public.sessions to authenticated;
grant update (note, photo_path) on public.sessions to authenticated;

create policy "Members read their family's sessions" on public.sessions
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

-- Note and photo live on the anchor (or a solo row), and only its owner edits them.
create policy "Members edit their own logged sessions" on public.sessions
  for update to authenticated
  using (member_id in (select private.my_member_ids()) and (shared_id is null or shared_id = id))
  with check (member_id in (select private.my_member_ids()) and (shared_id is null or shared_id = id));

-- "Remove me from this session", and deleting a solo session. An anchor with
-- other people on it goes through delete_session, which removes the whole group.
create policy "Members delete their own sessions" on public.sessions
  for delete to authenticated
  using (member_id in (select private.my_member_ids()) and (shared_id is null or shared_id <> id));

-- log_session ---------------------------------------------------------------------------
-- Logs a session for the caller and up to 3 others in the same family. Returns
-- one row per person: the anchor first, then the others in the order given.
-- skipped is true for someone who already has a session starting within 30
-- minutes of this one, or whose own date window doesn't allow this date; they
-- get no row (session_id is null).
-- If p_client_id was already logged by the caller, nothing is inserted and the
-- existing rows come back, with anyone in p_with who isn't in them as skipped.
create or replace function public.log_session(
  p_family_id uuid,
  p_started_at timestamptz,
  p_duration_minutes integer,
  p_sauna_type text,
  p_rounds integer default 1,
  p_temp_c numeric default null,
  p_humidity_pct integer default null,
  p_cold_plunge boolean default false,
  p_cold_minutes integer default null,
  p_place text default null,
  p_note text default null,
  p_source text default 'manual',
  p_with uuid[] default '{}',
  p_client_id uuid default null
)
returns table (session_id uuid, member_id uuid, skipped boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.members;
  others uuid[];
  anchor_id uuid;
  other_id uuid;
  other_tz text;
  win record;
  added integer := 0;
  v_place text := nullif(btrim(p_place), '');
  v_note text := nullif(p_note, '');
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if p_client_id is null then
    raise exception 'p_client_id is required' using errcode = '22023';
  end if;

  select * into me from public.members m where m.family_id = p_family_id and m.user_id = auth.uid();
  if not found then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;

  -- Distinct, in the order given.
  select coalesce(array_agg(w.id order by w.n), '{}') into others
    from (select distinct on (x.id) x.id, x.n
            from unnest(coalesce(p_with, '{}')) with ordinality as x (id, n)
           where x.id is not null
           order by x.id, x.n) w;

  if me.id = any (others) then
    raise exception 'you''re already in this session; don''t list yourself in p_with' using errcode = '22023';
  end if;
  if cardinality(others) > 3 then
    raise exception 'a session is at most 4 people' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(others) o (id)
     where not exists (select 1 from public.members m where m.id = o.id and m.family_id = p_family_id)
  ) then
    raise exception 'everyone in a session must be in your family' using errcode = '42501';
  end if;

  -- A retry of a session already logged.
  select s.id into anchor_id from public.sessions s
   where s.logged_by = me.id and s.member_id = me.id and s.client_id = p_client_id;

  if anchor_id is null then
    begin
      insert into public.sessions (member_id, logged_by, started_at, duration_minutes, rounds, sauna_type,
                                   temp_c, humidity_pct, cold_plunge, cold_minutes, place, note, source, client_id)
      values (me.id, me.id, p_started_at, p_duration_minutes, p_rounds, p_sauna_type,
              p_temp_c, p_humidity_pct, coalesce(p_cold_plunge, false), p_cold_minutes, v_place, v_note,
              p_source, p_client_id)
      returning id into anchor_id;
    exception when unique_violation then
      -- The same client_id arriving twice at once: the other call won.
      select s.id into anchor_id from public.sessions s
       where s.logged_by = me.id and s.member_id = me.id and s.client_id = p_client_id;
      if anchor_id is null then
        raise;
      end if;
      return query select * from private.session_group_result(anchor_id, others);
      return;
    end;

    foreach other_id in array others loop
      select m.timezone into other_tz from public.members m where m.id = other_id;
      select w.earliest, w.latest into win from private.workout_date_window(now(), other_tz) w;
      if exists (
           select 1 from public.sessions s
            where s.member_id = other_id
              and s.started_at between p_started_at - interval '30 minutes' and p_started_at + interval '30 minutes')
         or (p_started_at at time zone other_tz)::date not between win.earliest and win.latest then
        continue;
      end if;

      insert into public.sessions (member_id, shared_id, logged_by, started_at, duration_minutes, rounds,
                                   sauna_type, temp_c, humidity_pct, cold_plunge, cold_minutes, place,
                                   source, client_id)
      values (other_id, anchor_id, me.id, p_started_at, p_duration_minutes, p_rounds,
              p_sauna_type, p_temp_c, p_humidity_pct, coalesce(p_cold_plunge, false), p_cold_minutes, v_place,
              p_source, p_client_id);
      added := added + 1;
    end loop;

    if added > 0 then
      update public.sessions set shared_id = id where id = anchor_id;
    end if;

    perform private.after_session_logged(anchor_id);

  end if;

  return query select * from private.session_group_result(anchor_id, others);
end;
$$;

-- What log_session returns: the anchor first, then the people in p_with in the
-- order given, with session_id null and skipped true for anyone not in the session.
create or replace function private.session_group_result(p_anchor_id uuid, p_with uuid[])
returns table (session_id uuid, member_id uuid, skipped boolean)
language sql
stable
set search_path = ''
as $$
  select r.sid, r.mid, r.sid is null
    from (
      select a.id as sid, a.member_id as mid, 0::bigint as ord
        from public.sessions a where a.id = p_anchor_id
      union all
      select s.id, o.id, o.n
        from unnest(p_with) with ordinality as o (id, n)
        left join public.sessions s on s.shared_id = p_anchor_id and s.member_id = o.id and s.id <> p_anchor_id
      union all
      select s.id, s.member_id, 1000
        from public.sessions s
       where s.shared_id = p_anchor_id and s.id <> p_anchor_id and s.member_id <> all (p_with)
    ) r
   order by r.ord, r.mid;
$$;

revoke all on function private.session_group_result(uuid, uuid[]) from public;

-- Called once per newly logged session, after every row is in. The push
-- migration (20261021000005) fills this in; here it does nothing.
create or replace function private.after_session_logged(p_anchor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  return;
end;
$$;

revoke all on function private.after_session_logged(uuid) from public;
revoke all on function public.log_session(uuid, timestamptz, integer, text, integer, numeric, integer, boolean,
  integer, text, text, text, uuid[], uuid) from public, anon;
grant execute on function public.log_session(uuid, timestamptz, integer, text, integer, numeric, integer, boolean,
  integer, text, text, text, uuid[], uuid) to authenticated;

-- The anchor of a session (itself when solo), if the caller logged it.
-- Raises 42501 otherwise, without saying whether the session exists.
create or replace function private.my_logged_anchor(p_session_id uuid, p_action text)
returns public.sessions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.sessions;
  anchor public.sessions;
begin
  select * into s from public.sessions where id = p_session_id;
  if found then
    select * into anchor from public.sessions where id = coalesce(s.shared_id, s.id);
  end if;
  if anchor.id is null
     or anchor.member_id not in (select m.id from public.members m where m.user_id = auth.uid()) then
    raise exception 'only the person who logged this session can % it', p_action using errcode = '42501';
  end if;
  return anchor;
end;
$$;

revoke all on function private.my_logged_anchor(uuid, text) from public;

-- update_session ------------------------------------------------------------------------
-- Changes a session for everyone in it. p_changes is a JSON object; only the
-- keys present change, and a JSON null clears an optional field. Keys:
--   started_at, duration_minutes, rounds, sauna_type, temp_c, humidity_pct,
--   cold_plunge, cold_minutes, place, note, photo_path
-- note and photo_path change on the anchor only. Turning cold_plunge off clears
-- cold_minutes. Any other key raises 22023. Returns the group's rows.
create or replace function public.update_session(p_session_id uuid, p_changes jsonb)
returns setof public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  anchor public.sessions;
  allowed constant text[] := array['started_at', 'duration_minutes', 'rounds', 'sauna_type', 'temp_c',
    'humidity_pct', 'cold_plunge', 'cold_minutes', 'place', 'note', 'photo_path'];
  bad text;
  c jsonb := coalesce(p_changes, '{}');
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if jsonb_typeof(c) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  select k into bad from jsonb_object_keys(c) k where k <> all (allowed) limit 1;
  if bad is not null then
    raise exception 'update_session can''t change %', bad using errcode = '22023';
  end if;

  anchor := private.my_logged_anchor(p_session_id, 'change');

  update public.sessions s set
    started_at = case when c ? 'started_at' then (c->>'started_at')::timestamptz else s.started_at end,
    duration_minutes = case when c ? 'duration_minutes' then (c->>'duration_minutes')::smallint else s.duration_minutes end,
    rounds = case when c ? 'rounds' then (c->>'rounds')::smallint else s.rounds end,
    sauna_type = case when c ? 'sauna_type' then c->>'sauna_type' else s.sauna_type end,
    temp_c = case when c ? 'temp_c' then (c->>'temp_c')::numeric else s.temp_c end,
    humidity_pct = case when c ? 'humidity_pct' then (c->>'humidity_pct')::smallint else s.humidity_pct end,
    cold_plunge = case when c ? 'cold_plunge' then (c->>'cold_plunge')::boolean else s.cold_plunge end,
    cold_minutes = case
      when c ? 'cold_plunge' and not (c->>'cold_plunge')::boolean then null
      when c ? 'cold_minutes' then (c->>'cold_minutes')::smallint
      else s.cold_minutes end,
    place = case when c ? 'place' then nullif(btrim(c->>'place'), '') else s.place end,
    note = case when s.id = anchor.id and c ? 'note' then nullif(c->>'note', '') else s.note end,
    photo_path = case when s.id = anchor.id and c ? 'photo_path' then c->>'photo_path' else s.photo_path end
   where s.id = anchor.id or s.shared_id = anchor.id;

  return query
    select * from public.sessions s
     where s.id = anchor.id or s.shared_id = anchor.id
     order by (s.id = anchor.id) desc, s.created_at, s.id;
end;
$$;

revoke all on function public.update_session(uuid, jsonb) from public, anon;
grant execute on function public.update_session(uuid, jsonb) to authenticated;

-- delete_session ------------------------------------------------------------------------
-- The logger deletes the whole session, everyone's rows, with its cheers and
-- comments. Anyone else gets 42501 and should delete their own row ("Remove me").
-- The photo file stays in Storage; the app deletes it from the logger's folder.
-- Returns how many rows went.
create or replace function public.delete_session(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  anchor public.sessions;
  gone integer;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  anchor := private.my_logged_anchor(p_session_id, 'delete');
  delete from public.sessions s where s.id = anchor.id or s.shared_id = anchor.id;
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.delete_session(uuid) from public, anon;
grant execute on function public.delete_session(uuid) to authenticated;
