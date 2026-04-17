-- ============================================================
-- User Profiles migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Expand profiles table
alter table public.profiles
  add column if not exists display_name   text,
  add column if not exists bio            text,
  add column if not exists location       text,
  add column if not exists website        text,
  add column if not exists username_color text not null default '#ffffff',
  add column if not exists banner_color   text not null default '#5865f2',
  add column if not exists badge          text,
  add column if not exists pronouns       text,
  add column if not exists member_since   timestamptz not null default now(),
  add column if not exists updated_at     timestamptz not null default now();

-- Backfill member_since from created_at for existing rows
update public.profiles set member_since = created_at where member_since > created_at;

-- 2. updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 3. Avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 4. Storage RLS — public read
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 5. Storage RLS — authenticated upload within own folder
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
