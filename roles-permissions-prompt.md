# Claude Code Prompt — Role-Based Permission System

Add a role-based permission system to the chat app with the following spec:

---

## Roles (in order of authority)

`admin` → `moderator` → `user` → `noob`

---

## Role Definitions

- **admin** — Supreme leader. Full control over everything: manage all groups, channels, members, roles, messages. Can assign any role to any user. Can delete the group itself. Only one admin per group (the owner). Cannot be demoted by anyone except themselves.
- **moderator** — Can create, edit, and delete channels within a group. Can generate and revoke invite codes. Can kick members (but not other moderators or admins). Can delete any message in channels they moderate. Cannot assign roles.
- **user** — Standard member. Can read and send messages in all channels they are a member of. Can edit and delete their own messages only. Cannot manage channels or members.
- **noob** — Restricted member. Can only read and post in a channel named exactly `welcome`. Cannot see, access, or post in any other channel. This state is for new joiners who haven't been promoted yet.

---

## Database Changes

Update the `group_members` table — the existing `role` column should use these exact values as a postgres enum: `admin`, `moderator`, `user`, `noob`. Default value for new members joining via invite code is `noob`.

Add a `permissions` helper in `lib/permissions.ts` that exports:

```ts
type Role = 'admin' | 'moderator' | 'user' | 'noob'

const PERMISSIONS = {
  canManageChannels: (role: Role) => ['admin', 'moderator'].includes(role),
  canGenerateInvite: (role: Role) => ['admin', 'moderator'].includes(role),
  canDeleteAnyMessage: (role: Role) => ['admin', 'moderator'].includes(role),
  canDeleteOwnMessage: (role: Role) => ['admin', 'moderator', 'user'].includes(role),
  canAssignRoles: (role: Role) => role === 'admin',
  canKickMembers: (role: Role) => ['admin', 'moderator'].includes(role),
  canAccessChannel: (role: Role, channelName: string) => {
    if (role === 'noob') return channelName === 'welcome'
    return true
  },
  canManageGroup: (role: Role) => role === 'admin',
}
```

---

## Behavior Rules

- When a new group is created, the creator is automatically assigned `admin` role in `group_members`
- When any user joins via invite code, they are assigned `noob` by default
- Noobs only see the `welcome` channel in the channels sidebar — all others are hidden from them
- If no `welcome` channel exists in the group, noobs see an empty channel list with a message: "You don't have access to any channels yet. Ask an admin to promote your role."
- Automatically create a `welcome` channel when a new group is created (in addition to `general`)
- Admins see a **Members** panel in the channel sidebar listing all group members with their current role, and a dropdown next to each member to reassign their role (cannot reassign other admins, cannot demote themselves)
- Moderators see the Members panel but the role dropdown is read-only (view only)
- Role changes take effect immediately via a Supabase Realtime subscription on `group_members` — the UI updates without a page refresh
- Kicking a member removes their `group_members` row entirely. If a noob is kicked and rejoins, they start as noob again.

---

## RLS Policy Updates

- **Messages**: users with role `noob` can only insert/select messages where the channel name is `welcome`
- **Channels**: users with role `noob` cannot select channels unless `name = 'welcome'`
- **group_members**: only `admin` role can update the `role` column for other members

---

## UI Changes

- In the Members panel, show a colored role badge next to each username:
  - `admin` = indigo
  - `moderator` = blue
  - `user` = gray
  - `noob` = yellow
- Right-click or three-dot menu on a message shows "Delete message" only if the user has permission per the rules above
- In the channels sidebar, show a small crown icon next to the group name if the current user is admin

---

## Instructions

Apply these changes on top of the existing codebase without breaking any existing functionality. Update `schema.sql` to reflect all DB changes.
