create table if not exists public.notification_preferences (
  user_id        uuid references public.profiles(id) on delete cascade primary key,
  dm_messages    boolean not null default true,
  mentions       boolean not null default true,
  group_messages boolean not null default false,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);

alter table public.notification_preferences enable row level security;

create policy "Users can view their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
