-- Workout details from Apple Health, and photos the family can see.
--
-- 1. Health workouts keep when they started, how far they went and their route.
--    The route is trimmed at both ends and thinned on the phone before it's sent
--    (src/state/routes.ts), then stored as a Google encoded polyline.
-- 2. A private Storage bucket for profile and workout photos. Files live at
--    <family id>/<member id>/<name>.jpg. Everyone in the family can read them;
--    only the member whose folder it is can add, replace or delete them.
--    members.photo_path and workouts.photo_path (already in the schema) hold the path.

-- ─── Workout details ─────────────────────────────────────────────────────────

alter table public.workouts
  add column started_at timestamptz,
  add column distance_m integer check (distance_m between 0 and 1000000),
  add column route text check (char_length(route) <= 20000);

grant insert (started_at, distance_m, route) on public.workouts to authenticated;
grant update (started_at, distance_m, route) on public.workouts to authenticated;

-- ─── Photos ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True when the object path is in the signed-in person's own folder:
-- <their family id>/<their member id>/...
create or replace function private.is_my_photo_folder(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.members m
     where m.user_id = (select auth.uid())
       and m.family_id::text = (storage.foldername(object_name))[1]
       and m.id::text = (storage.foldername(object_name))[2]
  );
$$;

-- True when the object path is under one of the signed-in person's families.
create or replace function private.is_my_family_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.members m
     where m.user_id = (select auth.uid())
       and m.family_id::text = (storage.foldername(object_name))[1]
  );
$$;

revoke all on function private.is_my_photo_folder(text) from public;
revoke all on function private.is_my_family_photo(text) from public;
grant execute on function private.is_my_photo_folder(text) to authenticated;
grant execute on function private.is_my_family_photo(text) to authenticated;

create policy "Family members see each other's photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and private.is_my_family_photo(name));

create policy "Members add photos to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and private.is_my_photo_folder(name));

create policy "Members replace their own photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and private.is_my_photo_folder(name))
  with check (bucket_id = 'photos' and private.is_my_photo_folder(name));

create policy "Members delete their own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and private.is_my_photo_folder(name));
