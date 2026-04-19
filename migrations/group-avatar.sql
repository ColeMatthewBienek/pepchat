-- Group avatar photo support
-- Run in Supabase SQL editor

-- 1. Add icon_url column (safe to run even if it already exists)
alter table groups
  add column if not exists icon_url text;

-- 2. Enable Realtime on the groups table so icon_url changes
--    propagate live to all members' sidebars
alter publication supabase_realtime add table groups;

-- 3. Storage RLS policies for group icons in the avatars bucket
--    Path structure: avatars/groups/{group_id}/icon.{ext}
--
--    The existing user-avatar policy only covers {user_id}/... paths,
--    so we need explicit policies for the groups/ prefix.

create policy "group admins can upload group icons"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1 from public.group_members
      where group_id  = ((storage.foldername(name))[2])::uuid
        and user_id   = auth.uid()
        and role      = 'admin'
    )
  );

create policy "group admins can update group icons"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1 from public.group_members
      where group_id  = ((storage.foldername(name))[2])::uuid
        and user_id   = auth.uid()
        and role      = 'admin'
    )
  );

create policy "group admins can delete group icons"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1 from public.group_members
      where group_id  = ((storage.foldername(name))[2])::uuid
        and user_id   = auth.uid()
        and role      = 'admin'
    )
  );
