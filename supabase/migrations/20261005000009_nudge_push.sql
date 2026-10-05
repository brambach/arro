-- A nudge ("Send a cheer" for someone who hasn't moved yet) pushes to the person
-- nudged. public.nudges already allows one per recipient per day, whoever sends it
-- (healthy-contact rule 4); this adds the push.
-- Never during their quiet hours: outside 07:00 to 21:00 in the recipient's own
-- zone the nudge is saved but nothing is queued.

alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in ('cheer', 'joined', 'evening', 'nudge'));

-- "Mum is cheering you on" to the person nudged.
create or replace function private.queue_nudge_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select them.user_id,
         'nudge',
         sender.display_name || ' is cheering you on',
         'You’ve still got today.',
         jsonb_build_object('kind', 'nudge', 'memberId', sender.id)
    from public.members them
    join public.members sender on sender.id = new.from_member_id
   where them.id = new.to_member_id
     and them.user_id <> sender.user_id
     and (now() at time zone them.timezone)::time >= time '07:00'
     and (now() at time zone them.timezone)::time < time '21:00';
  return null;
end;
$$;

create trigger nudges_queue_push
after insert on public.nudges
for each row execute function private.queue_nudge_push();

revoke all on function private.queue_nudge_push() from public;
