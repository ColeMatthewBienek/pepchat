# Claude Code Prompt — Unread Channel Badges

Add unread message indicators to channels in the sidebar. When a channel has messages the current user hasn't read, show a red dot. This mirrors Discord's core UX and uses the same `read_at` pattern already established for DMs.

---

## Database Changes

### New table: `channel_read_state`

```sql
create table channel_read_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade not null,
  channel_id      uuid references channels(id) on delete cascade not null,
  last_read_at    timestamptz not null default now(),
  constraint unique_user_channel unique (user_id, channel_id)
);

-- Index for fast lookup
create index idx_channel_read_state_user
  on channel_read_state(user_id, channel_id);
```

RLS policies:
```sql
alter table channel_read_state enable row level security;

create policy "users can view own read state"
  on channel_read_state for select
  using (auth.uid() = user_id);

create policy "users can insert own read state"
  on channel_read_state for insert
  with check (auth.uid() = user_id);

create policy "users can update own read state"
  on channel_read_state for update
  using (auth.uid() = user_id);
```

Add to Realtime publication:
```sql
alter publication supabase_realtime add table channel_read_state;
```

Update `schema.sql` to reflect all changes.

---

## Logic — What "Unread" Means

A channel has unread messages for a user if:

```sql
exists (
  select 1 from messages
  where channel_id = $channel_id
    and user_id != $current_user_id       -- don't count own messages as unread
    and created_at > coalesce(
      (select last_read_at from channel_read_state
       where user_id = $current_user_id
         and channel_id = $channel_id),
      '1970-01-01'::timestamptz           -- if no read state, everything is unread
    )
)
```

Rules:
- Your own messages never count as unread
- If no `channel_read_state` row exists for a user+channel pair, all messages in that channel are considered unread
- A channel with zero messages is never unread

---

## Marking a Channel as Read

Mark a channel as read when:
1. The user **opens** the channel (navigates to it)
2. The channel is **currently open** and a new message arrives via Realtime

Implementation — upsert on channel open:
```ts
await supabase
  .from('channel_read_state')
  .upsert({
    user_id: userId,
    channel_id: channelId,
    last_read_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,channel_id'
  })
```

Also update `last_read_at` when a new Realtime message arrives AND the channel is the currently active one (user is looking at it). Do not mark as read if the channel is in the background.

---

## lib/hooks/useUnreadChannels.ts

Create this hook:

```ts
// Returns a Set<string> of channel IDs that have unread messages for the current user
// Fetches unread state on mount for all channels the user is a member of
// Updates in real time via Realtime subscription on both `messages` (INSERT) and `channel_read_state` (INSERT/UPDATE)
// Efficient: does not re-query the full message list — uses timestamps only

export function useUnreadChannels(groupId: string): Set<string>
```

Implementation approach:
- On mount, fetch `channel_read_state` for all channels in the current group for the current user
- Fetch the `created_at` of the latest message per channel (one query using `select channel_id, max(created_at)`)
- A channel is unread if `max(created_at) > last_read_at` (or no read state exists)
- Subscribe to `messages` INSERT events for the group — when a new message arrives in a channel the user isn't currently viewing, add that channel to the unread set
- Subscribe to `channel_read_state` UPDATE events — when the user marks a channel as read, remove it from the unread set
- Return a stable `Set<string>` reference, updated via `useState`

---

## Sidebar UI — Unread Indicators

### Channel entry in channels sidebar

When a channel has unread messages:

```
# general          ●    ← red filled dot, right-aligned
# announcements
# off-topic        ●
```

- Red dot: `w-2 h-2 rounded-full bg-red-500`
- Positioned on the right side of the channel row
- Channel name text changes from muted to primary color when unread: `text-zinc-400` → `text-white font-medium`
- On hover: dot disappears (hover state shows the row highlight instead)
- When channel is active (selected): dot disappears — it's read

### Group icon in groups sidebar

When any channel in a group has unread messages, show a small indicator on the group's icon:

```
[ AD ]●   ← small red dot at bottom-right of the group icon
```

- Dot: `w-3 h-3 rounded-full bg-red-500 border-2 border-[#1e1f22]` positioned `absolute bottom-0 right-0`
- The border makes it visually pop against the dark sidebar background
- Disappears when all channels in the group are read

### DM section (already exists — wire it up)

The DM unread dots already planned in the DM prompt should use the same visual style as channel dots for consistency. Verify they match: `w-2 h-2 rounded-full bg-red-500`.

---

## Noob Role — Welcome Channel Only

For users with `noob` role, only track read state for the `welcome` channel. Do not query or display unread state for channels they cannot access.

---

## Performance Considerations

- Do not poll — use Realtime subscriptions exclusively
- Batch the initial unread state fetch into a single query per group load — not one query per channel
- Use `useMemo` to derive the unread set from the read state + latest message timestamps — avoid re-renders on every message
- Cache read state in a ref — only trigger re-render when the unread set actually changes

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User is new to a group | All channels show as unread until opened |
| Channel has no messages | Never shown as unread |
| User sends a message | Their own message does not trigger unread on any other channel |
| User opens channel, new message arrives from another user | Mark as read immediately since they're actively viewing it |
| User switches groups | Unread state for previous group is preserved — re-fetched when they return |
| Channel is deleted | `on delete cascade` removes read state automatically |

---

## Instructions

Apply on top of the existing codebase. Update `schema.sql`. No new npm packages required. Do not modify message rendering, DM logic, or any Supabase auth logic.
