-- ────────────────────────────────────────────────────────────
-- Reply-to feature migration
-- Run in Supabase SQL Editor
-- ────────────────────────────────────────────────────────────

-- 1. Add reply_to_id column
alter table public.messages
  add column if not exists reply_to_id uuid
    references public.messages(id) on delete set null;

-- 2. Index for joining back to the quoted message
create index if not exists idx_messages_reply_to
  on public.messages(reply_to_id);
