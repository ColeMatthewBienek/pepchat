# Phase 1 Architecture Patch: Server-side Primitives

## Problem

`ARCHITECTURE-IMPROVEMENTS.md` Phase 1 calls out two related server-action architecture gaps:

- Finding 3: server actions repeatedly construct a Supabase server client, call `auth.getUser()`, and hand-roll unauthenticated behavior.
- Finding 2: role predicates are centralized for UI in `lib/permissions.ts`, but server actions re-fetch `group_members` and inline role checks.

This causes drift risk. A role rule change must be made in `lib/permissions.ts` and then rediscovered across `app/(app)/**/actions.ts`. The first target surface is `members/actions.ts`, then `groups/actions.ts`, then `channels/actions.ts`.

Phase 0 is already present on `origin/main` at merge `a643401` and added `CONTEXT.md`, `lib/supabase/middleware.ts`, and shared query cleanup. This spec builds on that state and does not touch unrelated local WIP.

## Non-goals

- Do not change product permissions, RLS policies, database schema, migrations, or Supabase environment variables.
- Do not change visible action return shapes or unauthenticated redirect behavior.
- Do not convert all server actions in the app. Limit implementation to `members/actions.ts`, `groups/actions.ts`, and `channels/actions.ts` plus tests and supporting primitives.
- Do not introduce the Phase 2 side-effect wrapper, database audit triggers, realtime abstraction, invite domain module, or component-query hooks.
- Do not refactor audit logging or notification enqueueing beyond keeping existing calls working after action bodies are reorganized.
- Do not modify unrelated local changes currently visible in this workspace: `README.md`, `ARCHITECTURE-IMPROVEMENTS.md`, `app/(auth)/check-email/`, or `app/auth/confirm/`.
- Do not add dependencies.

## User Experience / Behavior

End users should see no intentional behavior change.

Preserve these current action contracts:

- `app/(app)/members/actions.ts`
  - `assignRole(...)` returns `{ error: string } | { ok: true }`.
  - `kickMember(...)` returns `{ error: string } | { ok: true }`.
  - Unauthenticated member actions still return `{ error: 'Not authenticated.' }`.
  - Admin-only, self-role-change, no-admin-assignment, target-admin, moderator-kick, audit metadata, and mutation behavior remain unchanged.
- `app/(app)/groups/actions.ts`
  - `createGroup(...)` still returns `{ redirectTo: '/login' }` for unauthenticated users and `{ redirectTo: ... }` on success.
  - `joinGroup(...)` still returns `{ redirectTo: '/login' }` for unauthenticated users and preserves managed-invite / legacy-invite behavior.
  - `updateGroupDetails(...)`, `regenerateGroupInvite(...)`, `listGroupInvites(...)`, `revokeGroupInvite(...)`, `uploadGroupIcon(...)`, and `removeGroupIcon(...)` still return `{ error: string } | { ok: true ... }` with their current messages.
  - `leaveGroup(...)` and `deleteGroup(...)` still redirect unauthenticated users to `/login` and preserve their success redirects.
  - Existing owner/admin scoping on group mutations is preserved, including `owner_id` filters where they already exist.
- `app/(app)/channels/actions.ts`
  - `createChannel(...)` and `deleteChannel(...)` still redirect unauthenticated users to `/login` and preserve success redirects.
  - `updateChannelSettings(...)` still returns `{ error: string } | { ok: true }`.
  - `moveChannel(...)` still returns `{ error: string } | void`.
  - Channel name normalization, topic limits, `noob_access`, ordering, and redirect behavior remain unchanged.

Maintainers should gain two small server primitives:

- a reusable auth wrapper that centralizes client/user acquisition while allowing each action to keep its existing unauthenticated result shape;
- a reusable group-role gate that consumes the same permission predicates as the UI.

## Technical Approach

Implement as a 3-PR series, not one mega-PR. Each PR should start from a clean branch/worktree based on `origin/main` and avoid the unrelated local WIP listed above.

### PR 1 — primitives plus `members/actions.ts`

1. Add `lib/actions/withAuth.ts`.

   The wrapper must live outside a `'use server'` action file so non-async helper exports do not violate Next server-action file constraints. Server action files can import it and export wrapped async actions.

   Suggested interface:

   ```ts
   import type { SupabaseClient, User } from '@supabase/supabase-js'
   import { createClient } from '@/lib/supabase/server'

   export type AuthenticatedActionContext = {
     supabase: SupabaseClient
     user: User
   }

   export function withAuth<Args extends unknown[], Result>(
     body: (ctx: AuthenticatedActionContext, ...args: Args) => Promise<Result>,
     options: {
       unauthenticated: () => Result | never
     }
   ): (...args: Args) => Promise<Result> {
     return async (...args) => {
       const supabase = await createClient()
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) return options.unauthenticated()
       return body({ supabase, user }, ...args)
     }
   }
   ```

   Requirements:
   - Do not force a universal action result type. Existing actions use different shapes, including redirects and `void`.
   - Do not throw for auth failures unless the current action already redirects/throws through `redirect('/login')`.
   - Do not put `createClient` calls inside migrated action bodies.
   - Verify `next build` accepts exported wrapped server actions before broad migration.

2. Update `lib/permissions.ts` for predicate sharing without breaking UI call sites.

   Keep the current `PERMISSIONS` object names and signatures. Add exported predicate types if useful:

   ```ts
   export type Role = 'admin' | 'moderator' | 'user' | 'noob'
   export type RolePredicate = (role: Role) => boolean
   ```

   Existing predicates such as `PERMISSIONS.canAssignRoles`, `PERMISSIONS.canKickMembers`, `PERMISSIONS.canManageGroup`, `PERMISSIONS.canGenerateInvite`, and `PERMISSIONS.canManageChannels` should remain callable by current components and tests.

3. Add `lib/permissions/gate.ts`.

   Suggested interface:

   ```ts
   import type { SupabaseClient } from '@supabase/supabase-js'
   import type { Role, RolePredicate } from '@/lib/permissions'

   export type GroupRoleGateResult =
     | { ok: true; membership: { role: Role } }
     | { error: string }

   export async function gateGroupRole(
     supabase: SupabaseClient,
     input: {
       groupId: string
       userId: string
       predicate: RolePredicate
       deniedMessage: string
     }
   ): Promise<GroupRoleGateResult>
   ```

   Requirements:
   - Query `group_members` for the caller row using `group_id` and `user_id`.
   - Return the Supabase lookup error message unchanged for real lookup errors.
   - Return `input.deniedMessage` when no role is found or the predicate returns false. This is the only approved tiny behavior hardening in Phase 1: an authenticated caller with no membership row should receive the same stable denial message as an insufficient-role caller, rather than a raw PostgREST "no rows" lookup detail. Do not change any other listed action messages or return shapes.
   - Return the membership row, at minimum `{ role }`, because actions such as `kickMember` need caller role metadata for later business rules and audit metadata.
   - Do not call `auth.getUser()` inside `gateGroupRole`; compose it with `withAuth` by passing `user.id`.
   - Keep target-member checks, self-action checks, and role-transition-specific rules in the action body unless they become pure predicates with obvious reuse.

4. Migrate `app/(app)/members/actions.ts`.

   - Convert `assignRole` to `withAuth(async ({ supabase, user }, groupId, targetUserId, newRole) => { ... }, { unauthenticated: () => ({ error: 'Not authenticated.' }) })` or equivalent.
   - Replace the caller admin lookup with `gateGroupRole(..., { predicate: PERMISSIONS.canAssignRoles, deniedMessage: 'Only admins can assign roles.' })`.
   - Keep current target checks and messages:
     - `You cannot change your own role.`
     - `Cannot assign the admin role.`
     - `Target member was not found.`
     - `Cannot change an admin's role.`
   - Convert `kickMember` similarly.
   - Replace the caller admin/moderator lookup with `gateGroupRole(..., { predicate: PERMISSIONS.canKickMembers, deniedMessage: 'You do not have permission to kick members.' })`.
   - Preserve moderator target restrictions and audit metadata exactly.

5. Add/adjust tests for PR 1.

   - Add `tests/lib/actions/withAuth.test.ts` or equivalent.
     - authenticated path passes one Supabase client and user into the body;
     - unauthenticated path returns the action-provided unauthenticated result;
     - body is not called when unauthenticated.
   - Add `tests/lib/permissions-gate.test.ts` or equivalent.
     - allows when predicate passes;
     - denies missing membership or failed predicate with caller-provided message;
     - propagates lookup error message;
     - does not call `auth.getUser()`.
   - Update `tests/app/members-actions.test.ts` to keep current behavior assertions and add one assertion proving the action uses the shared predicate path if practical.
   - Keep `tests/lib/permissions.test.ts` passing without rewriting component expectations.

### PR 2 — migrate `groups/actions.ts`

1. Migrate only auth and group-role gates in `app/(app)/groups/actions.ts`.

   Use `withAuth` with action-specific unauthenticated behavior:

   - `createGroup`: `unauthenticated: () => ({ redirectTo: '/login' })`; no group role gate because no group exists yet.
   - `joinGroup`: `unauthenticated: () => ({ redirectTo: '/login' })`; no group role gate because joining is the operation that creates membership.
   - `updateGroupDetails`: `unauthenticated: () => ({ error: 'Not authenticated.' })`; gate with `PERMISSIONS.canManageGroup` and denied message `Only group admins can update group details.`.
   - `regenerateGroupInvite`: preserve current server behavior in Phase 1 by gating with `PERMISSIONS.canManageGroup`, not `PERMISSIONS.canGenerateInvite`, and keep the denied message `Only group admins can regenerate invite links.`. The UI/server invite-role mismatch remains a separate product-decision follow-up.
   - `listGroupInvites`: preserve current server behavior in Phase 1 by gating with `PERMISSIONS.canManageGroup`; keep the denied message `Only group admins can view invite history.`.
   - `revokeGroupInvite`: preserve current server behavior in Phase 1 by gating with `PERMISSIONS.canManageGroup`; keep the denied message `Only group admins can revoke invites.`.
   - `leaveGroup`: `unauthenticated: () => redirect('/login')`; no privilege gate, but keep the current membership check that prevents admins from leaving.
   - `uploadGroupIcon`: gate with `PERMISSIONS.canManageGroup` and denied message `Only group admins can update the group photo.`.
   - `removeGroupIcon`: gate with `PERMISSIONS.canManageGroup` and denied message `Only group admins can remove the group photo.`.
   - `deleteGroup`: `unauthenticated: () => redirect('/login')`; keep existing `owner_id` scoped delete. Do not relax this to moderator/admin in Phase 1.

2. Remove or rewrite the private `getAdminMembership(...)` helper once all of its callers are migrated.

3. Preserve current mutation filters.

   Examples:
   - `updateGroupDetails` currently updates `groups` with `.eq('id', groupId).eq('owner_id', user.id)`. Keep this unless a separate product decision says group admins who are not owners can update details.
   - `regenerateGroupInvite` currently updates the legacy `groups.invite_code` with `.eq('id', groupId).eq('owner_id', user.id)`. Keep this in Phase 1; do not silently broaden write authority.
   - `deleteGroup` remains owner-scoped by the mutation, regardless of any gate helper.

4. Update `tests/app/groups-actions.test.ts`.

   Preserve existing assertions for:
   - unauthenticated behavior;
   - non-admin invite rejection messages;
   - group detail validation;
   - managed invite insert/update/audit behavior;
   - group icon storage error behavior;
   - redirect behavior mocked through `next/navigation`.

   Add coverage that migrated gated actions still deny insufficient roles with the same messages. Add at least one invite-action test proving moderators remain denied in Phase 1 despite `PERMISSIONS.canGenerateInvite('moderator') === true`.

### PR 3 — migrate `channels/actions.ts`

1. Migrate auth in `app/(app)/channels/actions.ts` with `withAuth`.

   Use action-specific unauthenticated behavior:

   - `createChannel`: `unauthenticated: () => redirect('/login')`.
   - `updateChannelSettings`: `unauthenticated: () => ({ error: 'Not authenticated.' })`.
   - `deleteChannel`: `unauthenticated: () => redirect('/login')`.
   - `moveChannel`: `unauthenticated: () => ({ error: 'Not authenticated.' })`.

2. Add explicit app-layer channel role gates while preserving RLS as the final backstop.

   - `createChannel` has `groupId` from form data. After validating `groupId`, call `gateGroupRole` with `PERMISSIONS.canManageChannels` and denied message `You do not have permission to manage channels.` before querying max position or inserting.
   - `updateChannelSettings` currently receives only `channelId`. Fetch the channel's `group_id` before updating, using a minimal select such as `id, group_id`. If lookup fails, return the lookup error message; if missing, return `Channel not found.`. Then gate with `PERMISSIONS.canManageChannels` and denied message `You do not have permission to manage channels.`.
   - `deleteChannel` receives both `channelId` and `groupId`. Gate on the provided `groupId` with `PERMISSIONS.canManageChannels` before deleting. Keep the success redirect to `/groups/${groupId}`.
   - `moveChannel` already fetches `id, group_id, position`. Gate after that fetch and before finding the adjacent channel or applying updates.

3. Keep current data behavior.

   - Do not change channel name normalization.
   - Do not change topic length validation.
   - Do not change `noob_access` handling.
   - Do not replace hard delete with archive/soft delete.
   - Do not add channel audit events in this phase.

4. Update `tests/app/channels-actions.test.ts`.

   Add/adjust coverage for:
   - unauthenticated behavior for each exported action;
   - insufficient role rejection for create/update/delete/move;
   - update path performs channel lookup before gate and mutation;
   - move path gates after selected-channel lookup and before adjacent lookup;
   - existing normalization, movement, no-adjacent, and update-error behavior remains covered.

## Data / Security Notes

- No database schema or RLS policy changes.
- RLS remains the final authorization layer. `gateGroupRole` is an app-layer consistency improvement, not a replacement for database policy.
- `withAuth` centralizes auth retrieval but must not introduce a universal error/throw convention. Different actions currently return `{ error }`, `{ redirectTo }`, `void`, or call `redirect('/login')`.
- Sharing `PERMISSIONS` predicates reduces drift, but Phase 1 must not change the actual business rule for who can manage invites, groups, members, or channels without explicit product approval.
- The invite-related group actions currently have a UI/server mismatch: `PERMISSIONS.canGenerateInvite` allows moderators, while the server helper `getAdminMembership` currently requires `admin`. Phase 1 preserves the server admin-only rule by using `PERMISSIONS.canManageGroup` for invite actions; resolving the UI predicate mismatch is out of scope for this spec.
- No secrets should be added to specs, test fixtures, summaries, or comments.

## Change Manifest

Expected implementation PR files across the 3-PR series:

PR 1:

- `lib/actions/withAuth.ts` — new server-action auth wrapper that preserves per-action unauthenticated result shape.
- `lib/permissions.ts` — export predicate types or small helpers while preserving existing `PERMISSIONS` call signatures.
- `lib/permissions/gate.ts` — new server-side group-role gate composed with `withAuth`.
- `app/(app)/members/actions.ts` — migrate `assignRole` and `kickMember` to `withAuth` and `gateGroupRole`.
- `tests/lib/actions/withAuth.test.ts` — unit coverage for wrapper behavior.
- `tests/lib/permissions-gate.test.ts` — unit/integration-style coverage for role gate query/deny/error behavior.
- `tests/app/members-actions.test.ts` — updated member action coverage preserving current return shapes and audit behavior.
- `tests/lib/permissions.test.ts` — update only if predicate exports require test import changes; existing behavior expectations remain.

PR 2:

- `app/(app)/groups/actions.ts` — migrate scoped group actions to `withAuth` and `gateGroupRole`; remove obsolete local membership helper if unused.
- `tests/app/groups-actions.test.ts` — update coverage for migrated auth/gate behavior and existing invite/group/icon flows.
- `tests/lib/permissions.test.ts` — update only if the invite predicate decision changes with explicit approval.

PR 3:

- `app/(app)/channels/actions.ts` — migrate channel actions to `withAuth` and explicit `gateGroupRole` checks.
- `tests/app/channels-actions.test.ts` — update coverage for auth/gate behavior and existing channel movement/settings behavior.

Optional if the implementation needs a shared type barrel, but keep it small:

- `lib/actions/index.ts` — re-export `withAuth` only if existing repo import style supports barrels; otherwise skip.
- `lib/permissions/index.ts` — do not add unless needed. Prefer direct imports to avoid unnecessary module churn.

No expected changes:

- `README.md`
- `ARCHITECTURE-IMPROVEMENTS.md`
- `CONTEXT.md`
- `app/(auth)/check-email/`
- `app/auth/confirm/`
- migrations or SQL policy files
- Phase 0 files unless imports/tests need a mechanical update

## Success Criteria

- The 3-PR series lands without changing user-visible behavior or action return shapes.
- `withAuth` is introduced and used by migrated member, group, and channel actions.
- `gateGroupRole` is introduced and used for migrated group-scoped role checks.
- `gateGroupRole` consumes `PERMISSIONS` predicates rather than duplicating role arrays in migrated actions.
- `members/actions.ts` no longer manually calls `createClient()` / `auth.getUser()` inside `assignRole` or `kickMember` bodies and no longer inlines the caller admin/moderator check.
- `groups/actions.ts` no longer has a duplicated `getAdminMembership` helper after all current callers are migrated; invite actions use `gateGroupRole` with `PERMISSIONS.canManageGroup` to preserve current server admin-only behavior.
- `channels/actions.ts` has explicit app-layer role gates for create/update/delete/move channel actions in addition to RLS.
- All current action messages listed in this spec are preserved unless a PR explicitly documents an approved exception.
- Existing audit calls in member and group actions still run with the same metadata after successful mutations.
- `next build` proves the `withAuth` exported-server-action pattern is supported by this Next.js 14.2.35 setup.
- No dependencies are added.
- Unrelated local WIP remains untouched.

## Test Plan

Run before each implementation PR:

- `git fetch origin`
- `git checkout -B <phase-1-pr-branch> origin/main` or use a clean worktree from `origin/main`.
- `git status --short --branch` and confirm only intended implementation files change.

PR 1 checks:

- `npm test -- tests/lib/actions/withAuth.test.ts`
- `npm test -- tests/lib/permissions-gate.test.ts`
- `npm test -- tests/lib/permissions.test.ts`
- `npm test -- tests/app/members-actions.test.ts`
- `npm run build`
- `npm run lint` if `next lint` is available; if it fails because `next lint` is unavailable/deprecated, record the exact tool failure.

PR 2 checks:

- `npm test -- tests/app/groups-actions.test.ts`
- `npm test -- tests/lib/permissions-gate.test.ts`
- `npm test -- tests/lib/permissions.test.ts`
- `npm run build`
- `npm run lint` with the same caveat as above.

PR 3 checks:

- `npm test -- tests/app/channels-actions.test.ts`
- `npm test -- tests/lib/permissions-gate.test.ts`
- `npm test -- tests/lib/permissions.test.ts`
- `npm run build`
- `npm run lint` with the same caveat as above.

Final series check after PR 3 or before publication:

- `npm test`
- `npm run build`
- Final `git status --short --branch`

## Rollback Notes

- If `next build` rejects exported actions created by `withAuth`, stop broad migration and either:
  - keep PR 1 as `gateGroupRole` only with explicit inline auth for now; or
  - replace the HOF with an inline helper such as `getAuthenticatedActionContext()` that each server action calls directly while preserving return shapes.
- If `gateGroupRole` changes any denial/error behavior, roll back the affected action file to its previous inline membership query and keep only the primitive tests for revision.
- If invite behavior differs because of the `canGenerateInvite` vs current admin-only server behavior mismatch, roll back invite-action migration. Phase 1 is required to preserve current server admin-only behavior for invite generation/list/revoke.
- If channel gates reveal that existing UI exposed controls more broadly than RLS allowed, preserve RLS behavior and treat UI correction as a separate bugfix, not a Phase 1 primitive change.
- Each PR should be independently revertible. PR 2 and PR 3 depend on PR 1 primitives; reverting PR 1 requires reverting later migrated action PRs first.

## Branch / PR Sequencing

Recommended branches from clean `origin/main`:

1. `architecture/phase-1-server-primitives-members`
   - Adds `withAuth`, `gateGroupRole`, predicate exports, member migration, and tests.
2. `architecture/phase-1-server-primitives-groups`
   - Based on PR 1 after merge; migrates group actions and tests.
3. `architecture/phase-1-server-primitives-channels`
   - Based on PR 2 after merge; migrates channel actions and tests.

Recommended board sequencing:

1. Adversary reviews this spec before any engineering card starts.
2. Engineer implements PR 1 only.
3. Reviewer/adversary reviews PR 1 for behavior preservation and `next build` compatibility.
4. Engineer implements PR 2 after PR 1 is merged.
5. Reviewer/adversary reviews PR 2, with special attention to invite/admin semantics.
6. Engineer implements PR 3 after PR 2 is merged.
7. Reviewer/adversary reviews PR 3, with special attention to newly explicit channel gates.
8. Publisher merges/publishes implementation PRs only after review gates pass.

## Evidence From Repo Inspection

- `git status --short --branch` at spec time: `## main...origin/main`, plus unrelated local changes in `README.md`, `ARCHITECTURE-IMPROVEMENTS.md`, `app/(auth)/check-email/`, and `app/auth/confirm/`.
- `git log --oneline -5 origin/main` shows Phase 0 merged at `a643401 refactor(architecture): implement phase 0 patch (#166)` after spec publication at `8b2d6cc`.
- `package.json` uses Next `14.2.35`, React 18, Supabase SSR `^0.10.2`, Vitest, and scripts `npm test`, `npm run build`, `npm run lint`.
- `lib/permissions.ts` currently exports `Role` and `PERMISSIONS` with predicates for channel management, invite generation, member role assignment, member kicking, group management, message actions, media, reactions, and DMs.
- `tests/lib/permissions.test.ts` already covers the pure permission predicates.
- `app/(app)/members/actions.ts` currently has two exported actions and manual auth/membership checks.
- `app/(app)/groups/actions.ts` currently has a local `getAdminMembership(...)` helper used by invite actions and repeated manual auth checks across group actions.
- `app/(app)/channels/actions.ts` currently has manual auth checks and relies heavily on RLS for role authority; explicit app-layer gates are missing.
- Existing action tests are under `tests/app/members-actions.test.ts`, `tests/app/groups-actions.test.ts`, and `tests/app/channels-actions.test.ts`.

## Open Questions

- Invite role semantics follow-up: should managed invite generation/list/revoke remain server-admin-only long term, or should the server match `PERMISSIONS.canGenerateInvite` where moderators are allowed? Phase 1 preserves current server behavior; answer this in a separate product/security spec before changing either side.
- Group admin vs owner semantics: several group mutations gate by admin membership but also filter writes by `owner_id = user.id`. Is that intended long term? Phase 1 should preserve it and leave any semantic change to a separate product/security spec.
- `withAuth` HOF compatibility: Next.js 14.2.35 likely accepts exported async functions returned by a wrapper from a `'use server'` file, but `npm run build` is the required proof. If not, use the rollback path above.
