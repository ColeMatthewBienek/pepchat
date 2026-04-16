-- ============================================================
-- Migration: Emoji Reactions
-- Run this against your Supabase project to add emoji reactions.
-- ============================================================

-- Table
create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  emoji      text not null,
  created_at timestamptz default now() not null,
  unique(message_id, user_id, emoji)
);

-- RLS
alter table public.message_reactions enable row level security;

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

-- Index for fast per-message lookups
create index if not exists idx_reactions_message on public.message_reactions(message_id);

-- Add to realtime publication
alter publication supabase_realtime add table public.message_reactions;
