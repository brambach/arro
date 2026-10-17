-- Cheering a finished workout, after the 17 October review:
--   1. A cheer pushes at most once per workout and person, so taking a cheer back
--      and giving it again doesn't buzz anyone's phone a second time.
--   2. Like nudges, a cheer is never pushed during the owner's quiet hours
--      (outside 07:00 to 21:00 in their own zone). The heart still shows in the app.
--   3. The schedule sends whatever is queued, not only the evening message, so a
--      cheer or nudge whose send-push call from the app failed still goes out.

-- 1. Once per workout and person ----------------------------------------------
create table private.cheer_pushes (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (workout_id, member_id)
);

create index cheer_pushes_member_id_idx on private.cheer_pushes (member_id);

alter table private.cheer_pushes enable row level security;
revoke all on private.cheer_pushes from public, anon, authenticated;

-- 2. "Mum cheered you on" to the person whose workout it is. Not for cheering
-- yourself, not twice, and not in their quiet hours.
create or replace function private.queue_cheer_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.cheer_pushes (workout_id, member_id)
  values (new.workout_id, new.member_id)
  on conflict do nothing;
  if not found then
    return null;
  end if;

  insert into private.push_outbox (user_id, kind, title, body, data)
  select owner.user_id,
         'cheer',
         cheerer.display_name || ' cheered you on',
         'For your ' || private.workout_noun(w.type) || '.',
         jsonb_build_object('kind', 'cheer', 'workoutId', w.id)
    from public.workouts w
    join public.members owner on owner.id = w.member_id
    join public.members cheerer on cheerer.id = new.member_id
   where w.id = new.workout_id
     and owner.id <> cheerer.id
     and owner.user_id <> cheerer.user_id
     and (now() at time zone owner.timezone)::time >= time '07:00'
     and (now() at time zone owner.timezone)::time < time '21:00';
  return null;
end;
$$;

-- 3. Send anything queued -----------------------------------------------------
-- Same as before, except it calls send-push whenever there's a fresh unsent row,
-- not only when it queued evening messages. Rows older than an hour are dropped
-- by claim_push_batch anyway, so they don't count.
create or replace function private.run_evening_nudges()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  anon_key text;
begin
  delete from private.push_outbox where created_at < now() - interval '7 days';
  perform private.queue_evening_nudges();
  if not exists (
    select 1 from private.push_outbox o
     where o.sent_at is null and o.created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'anon_key';
  if project_url is null or anon_key is null then
    raise warning 'Vault secrets project_url and anon_key are missing; pushes stay queued';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.run_evening_nudges() from public;
