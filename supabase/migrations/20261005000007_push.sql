-- Push notifications through Expo's push service (phase 4).
--   1. push_tokens: one Expo push token per phone, owned by whoever signed in last.
--   2. A queue (private.push_outbox) filled by triggers when someone cheers a
--      workout or joins a family. The send-push edge function drains it.
-- No badges: messages carry a title and body only (healthy-contact rule 5).

-- 1. Tokens --------------------------------------------------------------------
create table public.push_tokens (
  -- "ExponentPushToken[...]", from getExpoPushTokenAsync on the phone.
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[^]]+\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;

create policy "People read their own push tokens" on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Signing out deletes the phone's token so the next person doesn't get the last one's pushes.
create policy "People delete their own push tokens" on public.push_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- A phone keeps its token across sign-outs, so a new account on the same phone
-- takes the row over. RLS can't allow that, hence a function.
create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id) values (btrim(p_token), auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

-- 2. Queue ---------------------------------------------------------------------
create table private.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cheer', 'joined')),
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index push_outbox_unsent_idx on private.push_outbox (id) where sent_at is null;
create index push_outbox_user_id_idx on private.push_outbox (user_id);

create or replace function private.workout_noun(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'gym' then 'gym session'
    when 'other' then 'workout'
    else p_type
  end;
$$;

-- "Mum cheered you on" to the person whose workout it is. Not for cheering yourself.
create or replace function private.queue_cheer_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
     and owner.id <> cheerer.id;
  return null;
end;
$$;

create trigger cheers_queue_push
after insert on public.cheers
for each row execute function private.queue_cheer_push();

-- "Dad joined Home crew" to everyone already in the family.
create or replace function private.queue_joined_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select m.user_id,
         'joined',
         new.display_name || ' joined ' || f.name,
         'You’ll see them on Today from now on.',
         jsonb_build_object('kind', 'joined', 'memberId', new.id)
    from public.members m
    join public.families f on f.id = m.family_id
   where m.family_id = new.family_id
     and m.id <> new.id
     and m.user_id <> new.user_id;
  return null;
end;
$$;

create trigger members_queue_joined_push
after insert on public.members
for each row execute function private.queue_joined_push();

-- The edge function's side, service role only. Claims up to p_limit queued pushes
-- and returns one row per phone. Pushes older than an hour are marked sent and
-- dropped: a cheer that arrives the next day is noise.
create or replace function public.claim_push_batch(p_limit integer default 100)
returns table (outbox_id bigint, token text, title text, body text, data jsonb)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update private.push_outbox o
       set sent_at = now()
     where o.id in (
       select q.id from private.push_outbox q
        where q.sent_at is null
        order by q.id
        limit greatest(1, least(p_limit, 500))
        for update skip locked
     )
    returning o.id, o.user_id, o.title, o.body, o.data, o.created_at
  )
  select c.id, t.token, c.title, c.body, c.data
    from claimed c
    join public.push_tokens t on t.user_id = c.user_id
   where c.created_at > now() - interval '1 hour'
   order by c.id;
$$;

-- Tokens Expo reports as DeviceNotRegistered (the app was deleted).
create or replace function public.forget_push_tokens(p_tokens text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = any (p_tokens);
$$;

revoke all on function private.workout_noun(text) from public;
revoke all on function private.queue_cheer_push() from public;
revoke all on function private.queue_joined_push() from public;
revoke all on function public.register_push_token(text) from public, anon;
revoke all on function public.claim_push_batch(integer) from public, anon, authenticated;
revoke all on function public.forget_push_tokens(text[]) from public, anon, authenticated;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.claim_push_batch(integer) to service_role;
grant execute on function public.forget_push_tokens(text[]) to service_role;
