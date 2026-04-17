-- ============================================================
-- Direct Messages migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Create dm_conversations table
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

-- 2. Normalize pair: always store smaller UUID as user_a to prevent duplicates
create or replace function public.normalize_dm_pair()
returns trigger as $$
declare
  tmp uuid;
begin
  if new.user_a > new.user_b then
    tmp := new.user_a;
    new.user_a := new.user_b;
    new.user_b := tmp;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists dm_pair_normalize on public.dm_conversations;
create trigger dm_pair_normalize
  before insert on public.dm_conversations
  for each row execute function public.normalize_dm_pair();

-- 3. Expand direct_messages
alter table public.direct_messages
  add column if not exists conversation_id uuid references public.dm_conversations(id) on delete cascade,
  add column if not exists attachments     jsonb default '[]'::jsonb,
  add column if not exists edited_at       timestamptz;

-- 4. Indexes
create index if not exists idx_dm_conversations_users
  on public.dm_conversations(user_a, user_b);

create index if not exists idx_direct_messages_conversation
  on public.direct_messages(conversation_id, created_at desc);

-- 5. RLS — dm_conversations
alter table public.dm_conversations enable row level security;

create policy "participants can view their conversations"
  on public.dm_conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "authenticated users can create conversations"
  on public.dm_conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can update last_message"
  on public.dm_conversations for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- 6. RLS — direct_messages (add sender edit/delete; recipient read-mark already exists)
create policy "sender can edit own messages"
  on public.direct_messages for update to authenticated
  using (auth.uid() = sender_id);

create policy "sender can delete own messages"
  on public.direct_messages for delete to authenticated
  using (auth.uid() = sender_id);

-- 7. get_or_create_dm — atomically get or create a conversation between two users
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid as $$
declare
  conv_id uuid;
  uid     uuid := auth.uid();
  a       uuid;
  b       uuid;
begin
  if uid < other_user_id then
    a := uid; b := other_user_id;
  else
    a := other_user_id; b := uid;
  end if;

  select id into conv_id
  from public.dm_conversations
  where user_a = a and user_b = b;

  if conv_id is null then
    insert into public.dm_conversations (user_a, user_b)
    values (a, b)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$ language plpgsql security definer;

-- 8. Realtime
alter publication supabase_realtime add table public.dm_conversations;
-- direct_messages is already in supabase_realtime
