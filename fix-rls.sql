-- ============================================================
-- Fix: infinite recursion in group_members RLS policies
-- Root cause: the SELECT policy on group_members sub-queries
-- group_members itself, causing a recursive RLS loop.
-- Solution: a SECURITY DEFINER function that bypasses RLS,
-- used by all policies that need to check group membership.
-- ============================================================

-- ── Helper functions (bypass RLS via security definer) ──────

-- Returns the group IDs the current user belongs to.
create or replace function public.get_user_group_ids()
returns setof uuid language sql security definer stable
set search_path = public as $$
  select group_id from public.group_members where user_id = auth.uid()
$$;

-- Returns true if the current user is owner or admin of a group.
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  )
$$;

-- ── group_members policies ───────────────────────────────────

drop policy if exists "Members can view membership of their groups" on public.group_members;

-- Non-recursive: a user can see all rows in groups they belong to,
-- resolved via the security-definer helper.
create policy "Members can view membership of their groups"
  on public.group_members for select to authenticated
  using (group_id = any(select public.get_user_group_ids()));

-- ── groups policies ──────────────────────────────────────────

drop policy if exists "Members can view their groups" on public.groups;

create policy "Members can view their groups"
  on public.groups for select to authenticated
  using (id = any(select public.get_user_group_ids()));

-- Also allow reading a group by invite_code (for the join flow).
-- We use a separate permissive policy so the invite lookup works
-- before the user is a member.
drop policy if exists "Anyone can view a group by invite_code" on public.groups;

create policy "Anyone can read groups to check invite codes"
  on public.groups for select to authenticated
  using (true);

-- ── channels policies ────────────────────────────────────────

drop policy if exists "Members can view channels in their groups" on public.channels;
create policy "Members can view channels in their groups"
  on public.channels for select to authenticated
  using (group_id = any(select public.get_user_group_ids()));

drop policy if exists "Owners and admins can create channels" on public.channels;
create policy "Owners and admins can create channels"
  on public.channels for insert to authenticated
  with check (public.is_group_admin(group_id));

drop policy if exists "Owners and admins can update channels" on public.channels;
create policy "Owners and admins can update channels"
  on public.channels for update to authenticated
  using (public.is_group_admin(group_id));

drop policy if exists "Owners and admins can delete channels" on public.channels;
create policy "Owners and admins can delete channels"
  on public.channels for delete to authenticated
  using (public.is_group_admin(group_id));

-- ── messages policies ────────────────────────────────────────

drop policy if exists "Members can read messages in their channels" on public.messages;
create policy "Members can read messages in their channels"
  on public.messages for select to authenticated
  using (
    channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
    )
  );

drop policy if exists "Members can insert messages as themselves" on public.messages;
create policy "Members can insert messages as themselves"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and channel_id in (
      select id from public.channels
      where group_id = any(select public.get_user_group_ids())
    )
  );
