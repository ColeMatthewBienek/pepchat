-- Create/repair notification_events in the deployable Supabase migration path.
-- Mirrors the notification_events definition in schema.sql and the legacy
-- migrations/notification-events*.sql files.

create table if not exists public.notification_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  actor_id        uuid references public.profiles(id) on delete set null,
  type            text not null check (type in ('dm_message', 'mention', 'group_message')),
  source_table    text not null,
  source_id       uuid not null,
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  channel_id      uuid references public.channels(id) on delete cascade,
  title           text not null,
  body            text,
  url             text,
  read_at         timestamptz,
  pushed_at       timestamptz,
  push_error      text,
  created_at      timestamptz default now() not null,
  unique(user_id, type, source_id)
);

-- Repair partially-created tables without disturbing existing data. Required
-- columns are made NOT NULL only after verifying legacy rows are already
-- backfilled; if not, the migration fails with an actionable error instead of
-- silently leaving notification_events out of parity with schema.sql.
alter table public.notification_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists type text,
  add column if not exists source_table text,
  add column if not exists source_id uuid,
  add column if not exists conversation_id uuid,
  add column if not exists channel_id uuid,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists url text,
  add column if not exists read_at timestamptz,
  add column if not exists pushed_at timestamptz,
  add column if not exists push_error text,
  add column if not exists created_at timestamptz default now();

alter table public.notification_events
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

do $$
begin
  if exists (select 1 from public.notification_events where id is null) then
    raise exception 'Cannot repair public.notification_events: id contains NULL values. Backfill or remove legacy rows, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where user_id is null) then
    raise exception 'Cannot repair public.notification_events: user_id contains NULL values. Backfill each legacy row with a valid public.profiles.id, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where type is null) then
    raise exception 'Cannot repair public.notification_events: type contains NULL values. Backfill one of dm_message, mention, or group_message, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where source_table is null) then
    raise exception 'Cannot repair public.notification_events: source_table contains NULL values. Backfill the source table name for each legacy row, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where source_id is null) then
    raise exception 'Cannot repair public.notification_events: source_id contains NULL values. Backfill the source row id for each legacy row, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where title is null) then
    raise exception 'Cannot repair public.notification_events: title contains NULL values. Backfill notification titles for legacy rows, then rerun this migration.';
  end if;

  if exists (select 1 from public.notification_events where created_at is null) then
    raise exception 'Cannot repair public.notification_events: created_at contains NULL values. Backfill creation timestamps for legacy rows, then rerun this migration.';
  end if;

  alter table public.notification_events
    alter column id set not null,
    alter column user_id set not null,
    alter column type set not null,
    alter column source_table set not null,
    alter column source_id set not null,
    alter column title set not null,
    alter column created_at set not null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.notification_events'::regclass
      and contype = 'p'
  ) then
    alter table public.notification_events
      add constraint notification_events_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_type_check'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_type_check
      check (type in ('dm_message', 'mention', 'group_message'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_user_id_type_source_id_key'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_user_id_type_source_id_key
      unique (user_id, type, source_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_user_id_fkey'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_actor_id_fkey'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_actor_id_fkey
      foreign key (actor_id) references public.profiles(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_conversation_id_fkey'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_conversation_id_fkey
      foreign key (conversation_id) references public.dm_conversations(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_events_channel_id_fkey'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_channel_id_fkey
      foreign key (channel_id) references public.channels(id) on delete cascade
      not valid;
  end if;
end $$;

-- Bring repaired foreign keys to the same validated state as the canonical
-- schema. Existing bad legacy references fail with targeted messages so the
-- operator can clean them up without this migration deleting data.
do $$
begin
  if exists (
    select 1
    from public.notification_events ne
    where not exists (select 1 from public.profiles p where p.id = ne.user_id)
  ) then
    raise exception 'Cannot validate public.notification_events.user_id: at least one row does not reference public.profiles(id). Fix or remove orphaned legacy rows, then rerun this migration.';
  end if;

  if exists (
    select 1
    from public.notification_events ne
    where ne.actor_id is not null
      and not exists (select 1 from public.profiles p where p.id = ne.actor_id)
  ) then
    raise exception 'Cannot validate public.notification_events.actor_id: at least one row does not reference public.profiles(id). Fix or null orphaned legacy rows, then rerun this migration.';
  end if;

  if exists (
    select 1
    from public.notification_events ne
    where ne.conversation_id is not null
      and not exists (select 1 from public.dm_conversations dc where dc.id = ne.conversation_id)
  ) then
    raise exception 'Cannot validate public.notification_events.conversation_id: at least one row does not reference public.dm_conversations(id). Fix or null orphaned legacy rows, then rerun this migration.';
  end if;

  if exists (
    select 1
    from public.notification_events ne
    where ne.channel_id is not null
      and not exists (select 1 from public.channels c where c.id = ne.channel_id)
  ) then
    raise exception 'Cannot validate public.notification_events.channel_id: at least one row does not reference public.channels(id). Fix or null orphaned legacy rows, then rerun this migration.';
  end if;

  alter table public.notification_events validate constraint notification_events_user_id_fkey;
  alter table public.notification_events validate constraint notification_events_actor_id_fkey;
  alter table public.notification_events validate constraint notification_events_conversation_id_fkey;
  alter table public.notification_events validate constraint notification_events_channel_id_fkey;
end $$;

alter table public.notification_events enable row level security;

create index if not exists idx_notification_events_user_time
  on public.notification_events(user_id, created_at desc);

create index if not exists idx_notification_events_unpushed
  on public.notification_events(created_at)
  where pushed_at is null;

drop policy if exists "Users can view their own notification events" on public.notification_events;
create policy "Users can view their own notification events"
  on public.notification_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert notification events they authored" on public.notification_events;
create policy "Users can insert notification events they authored"
  on public.notification_events for insert to authenticated
  with check (actor_id = auth.uid());

drop policy if exists "Users can update their own notification events" on public.notification_events;
create policy "Users can update their own notification events"
  on public.notification_events for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own notification events" on public.notification_events;
create policy "Users can delete their own notification events"
  on public.notification_events for delete to authenticated
  using (user_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notification_events'
     ) then
    alter publication supabase_realtime add table public.notification_events;
  end if;
end $$;
