# Phase 2 Completion — Side-Effects Migration for All Action Files

## Status: COMPLETE

### Migrated Files (this session):

1. **`app/(app)/notifications/actions.ts`** ✅ Full rewrite — All 7 functions now use `withAuth`
   - `getNotificationPreferences` → `withAuth`
   - `updateNotificationPreferences` → `withAuth`
   - `saveNotificationSubscription` → `withAuth`
   - `deleteNotificationSubscription` → `withAuth`
   - `getNotificationEvents` → `withAuth`
   - `markNotificationEventRead` → `withAuth`
   - `markAllNotificationEventsRead` → `withAuth`

2. **`app/(app)/profile/actions.ts`** ✅ Partial migration
   - `getProfile` — Kept as-is. This is a public read-only lookup (not auth-bound: callers look up other users' profiles)
   - `updateProfile` → `withAuth`
   - `removeAvatar` → `withAuth`

3. **`app/(app)/reactions/actions.ts`** ✅ Full rewrite
   - `toggleReaction` → `withAuth`

4. **`app/(app)/dm/actions.ts`** ✅ Completed migration
   - Previously: 4/5 functions migrated, `markDMsRead` still inline
   - Now: All 5 functions use `withAuth`
   - `markDMsRead` → `withAuth`

### NOT Migrated (by design):

- **`app/(auth)/actions.ts`** — Auth lifecycle functions (login/signup/logout/setupProfile). These are the auth mechanism itself — cannot meaningfully use `withAuth`.

- **`app/admin/actions.ts`** — Admin-specific authentication pattern. These actions go through a separate `getAdminUserId()` guard that checks admin role in `group_members`. Different auth domain — should not use user-facing `withAuth` primitive.

### Summary:

All *user-facing* action files now use the `withAuth` middleware primitive. The two remaining files with inline `createClient()`/`getUser()` are:
1. Auth lifecycle (auth actions themselves)
2. Admin actions (separate admin auth domain)

Both are legitimately exempt from the migration.

### Remaining work (deferred to next sessions):

- **Phase 2 continued**: Wrap admin actions with `withSideEffects` where applicable (audit logging is already done but could use the wrapper for consistency)
- **Phase 3**: Realtime hooks for remaining client-side query patterns
- **Phase 4**: Invite domain module consolidation
- **Findings 10-12**: Deferred items from original audit
