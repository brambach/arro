-- Saunafam build 9, part 4: cheers and comments on sessions.
-- They live on a session's anchor (or a solo session), so everyone in a shared
-- session sees the same ones. A trigger refuses them on any other row.
-- Row-level security mirrors cheers (20261005000002) and comments
-- (20261017000004, 20261018000001). The old tables stay for build 8.

create table public.session_cheers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  -- Who cheered.
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create index session_cheers_member_id_idx on public.session_cheers (member_id);

create table public.session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  -- Who wrote it.
  member_id uuid not null references public.members (id) on delete cascade,
  -- At most 200 characters as sent, and not blank.
  body text not null check (char_length(body) <= 200 and char_length(btrim(body)) >= 1),
  created_at timestamptz not null default now()
);

create index session_comments_session_id_idx on public.session_comments (session_id, created_at);
create index session_comments_member_id_idx on public.session_comments (member_id);

-- Anchor only ------------------------------------------------------------------
create or replace function private.check_session_anchor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.sessions s
     where s.id = new.session_id and s.shared_id is not null and s.shared_id <> s.id
  ) then
    raise exception 'cheers and comments go on the shared session''s anchor row' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger session_cheers_anchor_only
before insert on public.session_cheers
for each row execute function private.check_session_anchor();

create trigger session_comments_anchor_only
before insert on public.session_comments
for each row execute function private.check_session_anchor();

-- At most 20 comments a day from one person. private.check_comment_rate counts
-- the old comments table, so this is its own function.
create or replace function private.check_session_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.session_comments c
       where c.member_id = new.member_id and c.created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many comments today' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger session_comments_rate_limit
before insert on public.session_comments
for each row execute function private.check_session_comment_rate();

revoke all on function private.check_session_anchor() from public;
revoke all on function private.check_session_comment_rate() from public;

-- Row-level security -------------------------------------------------------------
alter table public.session_cheers enable row level security;
alter table public.session_comments enable row level security;
revoke all on public.session_cheers, public.session_comments from anon, authenticated;

grant select, delete on public.session_cheers to authenticated;
grant insert (session_id, member_id) on public.session_cheers to authenticated;
grant select, delete on public.session_comments to authenticated;
grant insert (session_id, member_id, body) on public.session_comments to authenticated;

create policy "Members read session cheers in their family" on public.session_cheers
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create policy "Members cheer sessions in the same family" on public.session_cheers
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.sessions s
        join public.members owner on owner.id = s.member_id
        join public.members me on me.family_id = owner.family_id
       where s.id = session_cheers.session_id
         and me.id = session_cheers.member_id
         and me.user_id = (select auth.uid())
    )
  );

create policy "Members take back their own session cheers" on public.session_cheers
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

create policy "Members read session comments in their family" on public.session_comments
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create policy "Members comment on sessions in the same family" on public.session_comments
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.sessions s
        join public.members owner on owner.id = s.member_id
        join public.members me on me.family_id = owner.family_id
       where s.id = session_comments.session_id
         and me.id = session_comments.member_id
         and me.user_id = (select auth.uid())
    )
  );

-- Your own comments, and any comment on a session you logged (comments are
-- only ever on an anchor or a solo row, and its owner is who logged it).
create policy "Members delete their own comments and comments on sessions they logged" on public.session_comments
  for delete to authenticated
  using (
    member_id in (select private.my_member_ids())
    or session_id in (
      select s.id from public.sessions s
       where s.member_id in (select private.my_member_ids()) and (s.shared_id is null or s.shared_id = s.id)
    )
  );
