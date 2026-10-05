-- Row-level security: a signed-in person only reads and writes inside the
-- families they belong to. Anonymous clients get nothing from these tables.
-- Families and members are created only through create_family and join_family.

create or replace function private.my_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.members where user_id = (select auth.uid());
$$;

create or replace function private.my_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.members where user_id = (select auth.uid());
$$;

revoke all on function private.my_family_ids() from public;
revoke all on function private.my_member_ids() from public;
grant execute on function private.my_family_ids() to authenticated;
grant execute on function private.my_member_ids() to authenticated;

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.workouts enable row level security;
alter table public.cheers enable row level security;
alter table public.nudges enable row level security;
alter table public.family_plans enable row level security;

-- Start from no table access, then grant only what the app uses. Column lists
-- stop clients moving a row to another family or member.
revoke all on public.families, public.members, public.invites, public.workouts,
  public.cheers, public.nudges, public.family_plans from anon, authenticated;

grant select on public.families to authenticated;
grant update (name) on public.families to authenticated;

grant select, delete on public.members to authenticated;
grant update (display_name, colour, photo_path, timezone, reminder_time) on public.members to authenticated;

grant select, delete on public.invites to authenticated;
grant insert (family_id, invited_by, expires_at) on public.invites to authenticated;

grant select, delete on public.workouts to authenticated;
grant insert (member_id, local_date, type, duration_minutes, source, health_workout_id, photo_path, note)
  on public.workouts to authenticated;
grant update (local_date, type, duration_minutes, photo_path, note) on public.workouts to authenticated;

grant select, delete on public.cheers to authenticated;
grant insert (workout_id, member_id) on public.cheers to authenticated;

grant select on public.nudges to authenticated;
grant insert (from_member_id, to_member_id) on public.nudges to authenticated;

-- Read only. The RevenueCat webhook writes with the service role, which bypasses RLS.
grant select on public.family_plans to authenticated;

-- families
create policy "Members read their families" on public.families
  for select to authenticated
  using (id in (select private.my_family_ids()));

create policy "Members rename their families" on public.families
  for update to authenticated
  using (id in (select private.my_family_ids()))
  with check (id in (select private.my_family_ids()));

-- members
create policy "Members read their family's members" on public.members
  for select to authenticated
  using (family_id in (select private.my_family_ids()));

create policy "Members edit their own profile" on public.members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members leave a family" on public.members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- invites
create policy "Members read their family's invites" on public.invites
  for select to authenticated
  using (family_id in (select private.my_family_ids()));

create policy "Members invite to their family" on public.invites
  for insert to authenticated
  with check (
    invited_by in (
      select id from public.members
       where user_id = (select auth.uid()) and family_id = invites.family_id
    )
  );

create policy "Members withdraw their family's invites" on public.invites
  for delete to authenticated
  using (family_id in (select private.my_family_ids()));

-- workouts
create policy "Members read their family's workouts" on public.workouts
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create policy "Members log their own workouts" on public.workouts
  for insert to authenticated
  with check (member_id in (select private.my_member_ids()));

create policy "Members edit their own workouts" on public.workouts
  for update to authenticated
  using (member_id in (select private.my_member_ids()))
  with check (member_id in (select private.my_member_ids()));

create policy "Members delete their own workouts" on public.workouts
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

-- cheers
create policy "Members read cheers in their family" on public.cheers
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create policy "Members cheer workouts in the same family" on public.cheers
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.workouts w
        join public.members owner on owner.id = w.member_id
        join public.members me on me.family_id = owner.family_id
       where w.id = cheers.workout_id
         and me.id = cheers.member_id
         and me.user_id = (select auth.uid())
    )
  );

create policy "Members take back their own cheers" on public.cheers
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

-- nudges: only the sender and the recipient see a nudge, never the rest of the family.
create policy "Sender and recipient read a nudge" on public.nudges
  for select to authenticated
  using (
    from_member_id in (select private.my_member_ids())
    or to_member_id in (select private.my_member_ids())
  );

create policy "Members nudge someone in the same family" on public.nudges
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.members me
        join public.members them on them.family_id = me.family_id
       where me.id = nudges.from_member_id
         and them.id = nudges.to_member_id
         and me.user_id = (select auth.uid())
    )
  );

-- family_plans
create policy "Members read their family's plan" on public.family_plans
  for select to authenticated
  using (family_id in (select private.my_family_ids()));
