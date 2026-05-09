-- ============================================================
-- PepChat schema
-- Run on a fresh Supabase project to fully recreate the DB.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ────────────────────────────────────────────────────────────

create type if not exists public.member_role as enum ('admin', 'moderator', 'user', 'noob');

-- ────────────────────────────────────────────────────────────
-- 2. TABLES
-- ────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  username       text unique not null,
  avatar_url     text,
  display_name   text,
  bio            text,
  location       text,
  website        text,
  username_color text not null default '#ffffff',
  banner_color   text not null default '#5865f2',
  badge          text,
  pronouns       text,
  member_since   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_at     timestamptz default now() not null
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  icon_url    text,
  owner_id    uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique default substr(md5(random()::text), 0, 9) not null,
  created_at  timestamptz default now() not null
);

create table if not exists public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid references public.groups(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  role      public.member_role not null default 'noob',
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

create table if not exists public.channels (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups(id) on delete cascade not null,
  name        text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz default now() not null
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references public.channels(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  reply_to_id uuid references public.messages(id) on delete set null,
  attachments jsonb default '[]'::jsonb, -- array of {type:'image',...} or {type:'gif',...} objects
  edited_at   timestamptz,
  created_at  timestamptz default now() not null
);

create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  emoji      text not null,
  created_at timestamptz default now() not null,
  unique(message_id, user_id, emoji)
);

create table if not exists public.dm_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid references public.profiles(id) on delete cascade not null,
  user_b          uuid references public.profiles(id) on delete cascade not null,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz default now() not null,
  constraint unique_pair unique (user_a, user_b),
  constraint no_self_dm check (user_a != user_b)
);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  recipient_id    uuid references public.profiles(id) on delete cascade not null,
  content         text not null,
  attachments     jsonb default '[]'::jsonb,
  edited_at       timestamptz,
  read_at         timestamptz,
  created_at      timestamptz default now() not null
);

create table if not exists public.channel_read_state (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  channel_id   uuid references public.channels(id) on delete cascade not null,
  last_read_at timestamptz not null default now(),
  unique(user_id, channel_id)
);

create table if not exists public.notification_preferences (
  user_id        uuid references public.profiles(id) on delete cascade primary key,
  dm_messages    boolean not null default true,
  mentions       boolean not null default true,
  group_messages boolean not null default false,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);

create table if not exists public.notification_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

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

-- ────────────────────────────────────────────────────────────
-- 2. ENABLE RLS
-- ────────────────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.channels            enable row level security;
alter table public.messages            enable row level security;
alter table public.message_reactions   enable row level security;
alter table public.direct_messages     enable row level security;
alter table public.channel_read_state  enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_events enable row level security;

-- ────────────────────────────────────────────────────────────
-- 3. SECURITY DEFINER HELPERS
-- Bypass RLS inside policy checks to avoid infinite recursion
-- when policies on group_members sub-query group_members.
-- ────────────────────────────────────────────────────────────

create or replace function public.get_user_group_ids()
returns setof uuid language sql security definer stable
set search_path = public as $$
  select group_id from public.group_members where user_id = auth.uid()
$$;

-- Returns current user's role in a group (NULL if not a member).
create or replace function public.get_user_role_in_group(gid uuid)
returns public.member_role language sql security definer stable
set search_path = public as $$
  select role from public.group_members
  where group_id = gid and user_id = auth.uid()
  limit 1
$$;

-- True if the current user is the admin of a group.
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  )
$$;

-- True if the current user can manage channels (admin or moderator).
create or replace function public.can_manage_channels(gid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
      and role in ('admin', 'moderator')
  )
$$;

-- ────────────────────────────────────────────────────────────
-- 4. POLICIES — profiles
-- ────────────────────────────────────────────────────────────

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 5. POLICIES — groups
-- ────────────────────────────────────────────────────────────

-- Allow reading all groups (needed for invite code lookups before joining)
create policy "Authenticated users can read groups"
  on public.groups for select to authenticated
  using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their group"
  on public.groups for update to authenticated
  using (owner_id = auth.uid());

create policy "Owners can delete their group"
  on public.groups for delete to authenticated
  using (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 6. POLICIES — group_members
-- ────────────────────────────────────────────────────────────

create policy "Members can view membership of their groups"
  on public.group_members for select to authenticated
  using (group_id = any(select public.get_user_group_ids()));

create policy "Authenticated users can join groups"
  on public.group_members for insert to authenticated
  with check (user_id = auth.uid());

-- Admins can update roles; cannot change their own role or another admin's role
create policy "Admins can update member roles"
  on public.group_members for update to authenticated
  using (
    public.is_group_admin(group_id)
    and user_id <> auth.uid()
    and role <> 'admin'
  )
  with check (
    public.is_group_admin(group_id)
    and role <> 'admin'
  );

-- Users can leave; admins can kick non-admins; moderators can kick user/noob
create policy "Users can leave groups"
  on public.group_members for delete to authenticated
  using (
    user_id = auth.uid()
    or (
      public.is_group_admin(group_id)
      and user_id <> auth.uid()
      and role <> 'admin'
    )
    or (
      public.get_user_role_in_group(group_id) = 'moderator'
      and user_id <> auth.uid()
      and role in ('user', 'noob')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. POLICIES — channels
-- ────────────────────────────────────────────────────────────

-- noobs only see the 'welcome' channel; all other roles see everything
create policy "Members can view channels in their groups"
  on public.channels for select to authenticated
  using (
    group_id = any(select public.get_user_group_ids())
    and (
      public.get_user_role_in_group(group_id) != 'noob'
      or name = 'welcome'
    )
  );

create policy "Admins and moderators can create channels"
  on public.channels for insert to authenticated
  with check (public.can_manage_channels(group_id));

create policy "Admins and moderators can update channels"
  on public.channels for update to authenticated
  using (public.can_manage_channels(group_id));

create policy "Admins and moderators can delete channels"
  on public.channels for delete to authenticated
  using (public.can_manage_channels(group_id));

-- ────────────────────────────────────────────────────────────
-- 8. POLICIES — messages
-- ────────────────────────────────────────────────────────────

create policy "Members can read messages in their channels"
  on public.messages for select to authenticated
  using (
    channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(group_id) <> 'noob'
        or name = 'welcome'
      )
    )
  );

create policy "Members can insert messages as themselves"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(group_id) <> 'noob'
        or name = 'welcome'
      )
    )
  );

create policy "Users can update their own messages"
  on public.messages for update to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their own messages"
  on public.messages for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 9. POLICIES — message_reactions
-- ────────────────────────────────────────────────────────────

-- Any group member can read reactions on messages they can see
create policy "Members can view reactions in their channels"
  on public.message_reactions for select to authenticated
  using (
    message_id in (
      select m.id from public.messages m
      join public.channels c on c.id = m.channel_id
      where c.group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(c.group_id) <> 'noob'
        or c.name = 'welcome'
      )
    )
  );

-- Users can add reactions as themselves (noob: welcome channel only)
create policy "Members can insert reactions as themselves"
  on public.message_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and message_id in (
      select m.id from public.messages m
      join public.channels c on c.id = m.channel_id
      where c.group_id = any(select public.get_user_group_ids())
      and (
        public.get_user_role_in_group(c.group_id) <> 'noob'
        or c.name = 'welcome'
      )
    )
  );

-- Users can remove their own reactions
create policy "Members can delete their own reactions"
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 10. POLICIES — direct_messages
-- ────────────────────────────────────────────────────────────

create policy "Users can view their own DMs"
  on public.direct_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send DMs as themselves"
  on public.direct_messages for insert to authenticated
  with check (sender_id = auth.uid());

create policy "Recipients can mark DMs as read"
  on public.direct_messages for update to authenticated
  using (recipient_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 10. INDEXES
-- ────────────────────────────────────────────────────────────

create index if not exists idx_group_members_user    on public.group_members(user_id);
create index if not exists idx_group_members_group   on public.group_members(group_id);
create index if not exists idx_channels_group        on public.channels(group_id, position);
create index if not exists idx_messages_channel_time on public.messages(channel_id, created_at desc);
create index if not exists idx_messages_reply_to     on public.messages(reply_to_id);
create index if not exists idx_dm_sender             on public.direct_messages(sender_id, created_at desc);
create index if not exists idx_dm_recipient          on public.direct_messages(recipient_id, created_at desc);
create index if not exists idx_groups_invite_code    on public.groups(invite_code);
create index if not exists idx_reactions_message         on public.message_reactions(message_id);
create index if not exists idx_read_state_user_channel   on public.channel_read_state(user_id, channel_id);
create index if not exists idx_notification_subscriptions_user on public.notification_subscriptions(user_id);
create index if not exists idx_notification_events_user_time on public.notification_events(user_id, created_at desc);
create index if not exists idx_notification_events_unpushed on public.notification_events(created_at) where pushed_at is null;

-- ────────────────────────────────────────────────────────────
-- 11. POLICIES — channel_read_state
-- ────────────────────────────────────────────────────────────

create policy "Users can view their own read states"
  on public.channel_read_state for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own read states"
  on public.channel_read_state for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own read states"
  on public.channel_read_state for update to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 12. POLICIES — notification_preferences
-- ────────────────────────────────────────────────────────────

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

-- ────────────────────────────────────────────────────────────
-- 13. POLICIES — notification_subscriptions
-- ────────────────────────────────────────────────────────────

create policy "Users can view their own notification subscriptions"
  on public.notification_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own notification subscriptions"
  on public.notification_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own notification subscriptions"
  on public.notification_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own notification subscriptions"
  on public.notification_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 14. POLICIES — notification_events
-- ────────────────────────────────────────────────────────────

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

-- ────────────────────────────────────────────────────────────
-- 15. REALTIME
-- ────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.channel_read_state;
alter publication supabase_realtime add table public.notification_events;
