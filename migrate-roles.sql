-- ============================================================
-- Migration: new role system
-- admin | moderator | user | noob
-- ============================================================

-- 1. Create enum type
DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('admin', 'moderator', 'user', 'noob');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Migrate the role column to use the enum
--    Map: owner → admin, admin → admin, member → user, anything else → noob
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS role_new public.member_role DEFAULT 'noob';

UPDATE public.group_members SET role_new = CASE role
  WHEN 'owner'     THEN 'admin'::public.member_role
  WHEN 'admin'     THEN 'admin'::public.member_role
  WHEN 'member'    THEN 'user'::public.member_role
  ELSE                  'noob'::public.member_role
END;

ALTER TABLE public.group_members DROP COLUMN role;
ALTER TABLE public.group_members RENAME COLUMN role_new TO role;
ALTER TABLE public.group_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.group_members ALTER COLUMN role SET DEFAULT 'noob';

-- 3. Update / add security-definer helper functions

-- Returns the current user's role in a group (NULL if not a member).
CREATE OR REPLACE FUNCTION public.get_user_role_in_group(gid uuid)
RETURNS public.member_role LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT role FROM public.group_members
  WHERE group_id = gid AND user_id = auth.uid()
  LIMIT 1
$$;

-- True if the current user is the admin of a group.
CREATE OR REPLACE FUNCTION public.is_group_admin(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid() AND role = 'admin'
  )
$$;

-- True if the current user can manage channels (admin or moderator).
CREATE OR REPLACE FUNCTION public.can_manage_channels(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  )
$$;

-- 4. Drop old channel policies and replace with role-aware ones

DROP POLICY IF EXISTS "Members can view channels in their groups"   ON public.channels;
DROP POLICY IF EXISTS "Owners and admins can create channels"       ON public.channels;
DROP POLICY IF EXISTS "Admins and moderators can create channels"   ON public.channels;
DROP POLICY IF EXISTS "Owners and admins can update channels"       ON public.channels;
DROP POLICY IF EXISTS "Admins and moderators can update channels"   ON public.channels;
DROP POLICY IF EXISTS "Owners and admins can delete channels"       ON public.channels;
DROP POLICY IF EXISTS "Admins and moderators can delete channels"   ON public.channels;

-- noobs only see 'welcome'; all other roles see all channels in their groups
CREATE POLICY "Members can view channels in their groups"
  ON public.channels FOR SELECT TO authenticated
  USING (
    group_id = any(SELECT public.get_user_group_ids())
    AND (
      public.get_user_role_in_group(group_id) != 'noob'
      OR name = 'welcome'
    )
  );

CREATE POLICY "Admins and moderators can create channels"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_channels(group_id));

CREATE POLICY "Admins and moderators can update channels"
  ON public.channels FOR UPDATE TO authenticated
  USING (public.can_manage_channels(group_id));

CREATE POLICY "Admins and moderators can delete channels"
  ON public.channels FOR DELETE TO authenticated
  USING (public.can_manage_channels(group_id));

-- 5. Update message policies — noobs restricted to 'welcome' channel

DROP POLICY IF EXISTS "Members can read messages in their channels"    ON public.messages;
DROP POLICY IF EXISTS "Members can insert messages as themselves"       ON public.messages;

CREATE POLICY "Members can read messages in their channels"
  ON public.messages FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM public.channels
      WHERE group_id = any(SELECT public.get_user_group_ids())
        AND (
          public.get_user_role_in_group(group_id) != 'noob'
          OR name = 'welcome'
        )
    )
  );

CREATE POLICY "Members can insert messages as themselves"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (
      SELECT id FROM public.channels
      WHERE group_id = any(SELECT public.get_user_group_ids())
        AND (
          public.get_user_role_in_group(group_id) != 'noob'
          OR name = 'welcome'
        )
    )
  );

-- 6. group_members: add UPDATE policy so admins can reassign roles
--    Admins cannot change another admin's role; cannot demote themselves.

DROP POLICY IF EXISTS "Only admins can update member roles" ON public.group_members;

CREATE POLICY "Only admins can update member roles"
  ON public.group_members FOR UPDATE TO authenticated
  USING (
    public.is_group_admin(group_id)       -- caller must be admin
    AND user_id != auth.uid()              -- cannot edit own row
    AND role != 'admin'                    -- cannot demote other admins
  )
  WITH CHECK (
    public.is_group_admin(group_id)
    AND user_id != auth.uid()
    AND role != 'admin'                    -- new role cannot be admin either
  );

-- 7. group_members: add DELETE policy for kick (admin can kick anyone except
--    other admins; moderators can kick user/noob only)

DROP POLICY IF EXISTS "Admins and moderators can kick members" ON public.group_members;

CREATE POLICY "Admins and moderators can kick members"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id != auth.uid()   -- cannot kick yourself (use leave instead)
    AND (
      -- admins can remove any non-admin
      ( public.is_group_admin(group_id) AND role != 'admin' )
      OR
      -- moderators can remove user/noob
      (
        public.can_manage_channels(group_id)
        AND role IN ('user', 'noob')
      )
    )
  );
