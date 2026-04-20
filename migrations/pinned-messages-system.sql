-- System message columns on messages
alter table messages
  add column if not exists is_system  boolean default false,
  add column if not exists system_type text,
  add column if not exists system_data jsonb;

-- Pinned messages table
create table if not exists pinned_messages (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid not null references channels(id) on delete cascade,
  message_id        uuid not null references messages(id) on delete cascade,
  pinned_by_id      uuid references auth.users(id),
  system_message_id uuid references messages(id) on delete set null,
  pinned_at         timestamptz default now() not null,
  unique(channel_id, message_id)
);

create index if not exists idx_pinned_messages_channel
  on pinned_messages(channel_id, pinned_at desc);

-- Row Level Security
alter table pinned_messages enable row level security;

-- Any authenticated user can read pinned messages in any channel they can access
create policy "authenticated users can read pinned messages"
  on pinned_messages for select
  to authenticated
  using (true);

-- Only service role (server-side actions) can insert/delete pinned messages
-- The pin/unpin logic runs in server actions with the service key, so no
-- client-side insert/delete policy is needed.
create policy "service role can insert pinned messages"
  on pinned_messages for insert
  to service_role
  with check (true);

create policy "service role can delete pinned messages"
  on pinned_messages for delete
  to service_role
  using (true);

-- Enable realtime for pinned_messages
alter publication supabase_realtime add table pinned_messages;
