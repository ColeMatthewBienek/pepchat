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

alter table public.notification_events enable row level security;

create index if not exists idx_notification_events_user_time
  on public.notification_events(user_id, created_at desc);

create index if not exists idx_notification_events_unpushed
  on public.notification_events(created_at)
  where pushed_at is null;

create policy "Users can view their own notification events"
  on public.notification_events for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert notification events they authored"
  on public.notification_events for insert to authenticated
  with check (actor_id = auth.uid());

create policy "Users can update their own notification events"
  on public.notification_events for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own notification events"
  on public.notification_events for delete to authenticated
  using (user_id = auth.uid());
