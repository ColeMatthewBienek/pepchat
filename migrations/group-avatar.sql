-- Group avatar photo support
-- Run in Supabase SQL editor

-- 1. Add icon_url column (safe to run even if it already exists)
alter table groups
  add column if not exists icon_url text;

-- 2. Enable Realtime on the groups table so icon_url changes
--    propagate live to all members' sidebars
alter publication supabase_realtime add table groups;
