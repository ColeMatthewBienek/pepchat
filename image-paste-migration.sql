-- ============================================================
-- PepChat — Image paste migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add attachments column to messages
alter table public.messages
  add column if not exists attachments jsonb default '[]'::jsonb;

-- 2. Create chat-images storage bucket (public)
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- 3. Storage RLS policies

-- Authenticated users can upload into their own user-id subfolder
create policy "Users can upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public (anon + authenticated) can download any file in the bucket
create policy "Public can read chat-images"
  on storage.objects for select to public
  using (bucket_id = 'chat-images');

-- Users can delete only files they uploaded (owner_id set automatically by Supabase)
create policy "Users can delete own uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and owner_id = auth.uid()::text
  );
