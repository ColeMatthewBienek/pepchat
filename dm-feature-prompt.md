# Claude Code Prompt — Direct Messages (DMs)

Implement private 1:1 direct messaging between users. DMs are architecturally separate from groups and channels. They reuse the existing chat UI components (MessageList, MessageInput, emoji reactions, image paste, GIF picker) with a different data source. DMs are accessed via a dedicated section in the groups sidebar, below the group icons.

---

## Architecture Overview

- `dm_conversations` — tracks unique user pairs, one row per DM relationship
- `direct_messages` — stores the actual messages, linked to a conversation
- No involvement of the `groups`, `channels`, or `group_members` tables
- Realtime subscription on `direct_messages` filtered by `conversation_id`
- DM section lives in the groups sidebar below group icons, separated by a divider

---

## Database Changes

### New table: `dm_conversations`

```sql
create table dm_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid references profiles(id) on delete cascade not null,
  user_b          uuid references profiles(id) on delete cascade not null,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz default now(),
  constraint unique_pair unique (user_a, user_b),
  constraint no_self_dm check (user_a != user_b)
);
```

Enforce canonical ordering — always store the smaller UUID as `user_a` to prevent duplicate pairs. Use a BEFORE INSERT trigger:

```sql
create or replace function normalize_dm_pair()
returns trigger as $$
begin
  if new.user_a > new.user_b then
    declare tmp uuid := new.user_a;
    new.user_a := new.user_b;
    new.user_b := tmp;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger dm_pair_normalize
  before insert on dm_conversations
  for each row execute function normalize_dm_pair();
```

### Modify existing table: `direct_messages`

```sql
-- Add conversation_id to link messages to their conversation
alter table direct_messages
  add column if not exists conversation_id uuid references dm_conversations(id) on delete cascade,
  add column if not exists attachments jsonb default '[]'::jsonb,
  add column if not exists edited_at timestamptz;

-- Index for fast message fetching
create index if not exists idx_direct_messages_conversation
  on direct_messages(conversation_id, created_at desc);

-- Index for conversation list
create index if not exists idx_dm_conversations_users
  on dm_conversations(user_a, user_b);
```

### RLS Policies

```sql
-- dm_conversations: only the two participants can see or modify their conversation
alter table dm_conversations enable row level security;

create policy "participants can view their conversations"
  on dm_conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "authenticated users can create conversations"
  on dm_conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can update last_message"
  on dm_conversations for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- direct_messages: only sender and recipient can see messages
alter table direct_messages enable row level security;

create policy "participants can view messages"
  on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "sender can insert messages"
  on direct_messages for insert
  with check (auth.uid() = sender_id);

create policy "sender can edit own messages"
  on direct_messages for update
  using (auth.uid() = sender_id);

create policy "sender can delete own messages"
  on direct_messages for delete
  using (auth.uid() = sender_id);
```

### Realtime

Add `dm_conversations` and `direct_messages` to the `supabase_realtime` publication if not already present:

```sql
alter publication supabase_realtime add table dm_conversations;
alter publication supabase_realtime add table direct_messages;
```

Update `schema.sql` to reflect all changes.

---

## Helper Function — Get or Create Conversation

Create a Supabase database function to atomically get or create a DM conversation between two users:

```sql
create or replace function get_or_create_dm(other_user_id uuid)
returns uuid as $$
declare
  conv_id uuid;
  uid uuid := auth.uid();
  a uuid;
  b uuid;
begin
  -- normalize order
  if uid < other_user_id then
    a := uid; b := other_user_id;
  else
    a := other_user_id; b := uid;
  end if;

  -- try to find existing
  select id into conv_id
  from dm_conversations
  where user_a = a and user_b = b;

  -- create if not found
  if conv_id is null then
    insert into dm_conversations (user_a, user_b)
    values (a, b)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$ language plpgsql security definer;
```

Call from the client:
```ts
const { data: convId } = await supabase.rpc('get_or_create_dm', {
  other_user_id: targetUserId
})
```

---

## lib/hooks/useDMs.ts

Create this hook to manage the DM list and active conversation:

```ts
// Fetches all conversations for the current user, with the other user's profile joined
// Returns conversations sorted by last_message_at desc
// Subscribes to dm_conversations via Realtime for live updates (new DMs, last message preview)

export function useDMConversations() { ... }

// Fetches messages for a specific conversation
// Paginates: load last 50 on mount, load more on scroll up
// Subscribes to direct_messages filtered by conversation_id
// Returns messages, loading state, hasMore, loadMore()

export function useDMMessages(conversationId: string) { ... }
```

---

## Sidebar Changes — DM Section

Modify the `GroupsSidebar` component to add a DM section below the group icons:

```
[ group icon ]
[ group icon ]
[ group icon ]
[ + new group ]
──────────────     ← divider
✉️  DIRECT MESSAGES  ← section header, not clickable
[ @alice     ]   ← DM entry, shows avatar + display name/username
[ @bob    🔴 ]   ← unread indicator dot
[ @charlie   ]
```

### DM entry component
Each entry in the DM list shows:
- The other user's avatar (32×32, rounded-full) — or InitialAvatar fallback
- Their display name (or username if no display name)
- An unread indicator: a filled indigo dot on the right if there are unread messages
- Last message preview text (truncated to ~30 chars) on hover as tooltip
- Active state: indigo background when this DM is the current view
- On click: loads the DM conversation in the main chat area

### Unread tracking
Track unread state client-side using `read_at` on `direct_messages`:
- A message is unread if `read_at` is null and `recipient_id = auth.uid()`
- Mark messages as read by updating `read_at = now()` when the conversation is opened and visible
- Show the unread dot on the DM sidebar entry when any message in that conversation is unread
- Update `read_at` via a batch UPDATE when the user opens the conversation:
  ```ts
  await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .is('read_at', null)
  ```

### Empty state
If the user has no DMs yet, show below the divider:
```
  No direct messages yet.
  Click a user to start one.
```
In small muted text, no icon needed.

---

## Main Chat Area — DM View

When a DM conversation is active, the main chat area renders identically to a channel view with these differences:

### Header
```
[ avatar ] @username (or display name)        [ 🔍 ] [ members? ]
           Direct Message
```
- No channel name with `#` prefix
- Shows the other user's avatar and name
- Subtitle: "Direct Message"
- No channel settings or member count

### Message list
- Reuse `MessageList` component — it already handles message grouping, avatars, timestamps
- Pass `direct_messages` data instead of `messages` data
- All existing features work: emoji reactions, image display, GIF display, edit/delete own messages

### Message input
- Reuse `MessageInput` component unchanged
- Placeholder: `Message @username`
- All input features work: emoji picker, GIF picker, image paste, drag-and-drop

### Empty state
When a conversation exists but has no messages yet:
```
        [ large avatar ]
        @username
   This is the beginning of your
   direct message history with @username.
```
Centered in the chat area, Discord-style.

---

## UX Flow — Starting a DM

Three entry points, all lead to the same place:

### 1. From profile card
- User clicks another user's avatar/username → profile card opens
- Clicks **"Send Message"** button
- App calls `get_or_create_dm(targetUserId)`
- Main chat area switches to the DM view for that conversation
- DM entry appears (or activates) in the sidebar DM section

### 2. From member list panel
- User right-clicks or clicks `···` next to a member in the channel member list
- "Send Message" option in the context menu
- Same flow as above

### 3. From existing DM sidebar entry
- User clicks an existing DM entry in the sidebar
- Main chat area loads that conversation

---

## Routing

Add DM routes under the `(app)` layout:

```
app/
  (app)/
    dm/
      [conversationId]/
        page.tsx    ← DM conversation view
```

URL pattern: `/dm/{conversationId}`

On load, verify the current user is a participant in the conversation (`user_a` or `user_b`). If not, redirect to home.

---

## Realtime Subscriptions

### Active conversation
Subscribe to new messages in the open conversation:
```ts
supabase
  .channel(`dm:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'direct_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .subscribe()
```

### DM list sidebar
Subscribe to `dm_conversations` to catch new conversations started by the other user:
```ts
supabase
  .channel('dm_conversations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'dm_conversations',
    filter: `user_a=eq.${userId}` // also subscribe for user_b
  }, handleConversationUpdate)
  .subscribe()
```

Since RLS limits what each user sees, both subscriptions are safe — they will only receive rows the user is permitted to see.

---

## Typing Indicators

Reuse the existing Supabase Realtime Presence pattern from channel typing indicators:

```ts
const dmChannel = supabase.channel(`dm-presence:${conversationId}`)

// Track typing
dmChannel.track({ typing: true, user_id: userId })

// Listen
dmChannel.on('presence', { event: 'sync' }, () => {
  const state = dmChannel.presenceState()
  // filter for other user typing
})
```

Show "[Name] is typing..." below the message list, same style as channels.

---

## New Components

```
components/
  dm/
    DMSection.tsx           ← sidebar DM list section (header + entries)
    DMEntry.tsx             ← individual DM row in sidebar
    DMConversationView.tsx  ← main chat area in DM mode
    DMHeader.tsx            ← header bar showing other user info
    DMEmptyState.tsx        ← "start of your DM history" screen
```

---

## TypeScript Types

Add to `lib/types.ts`:

```ts
export type DMConversation = {
  id: string
  user_a: string
  user_b: string
  last_message: string | null
  last_message_at: string | null
  created_at: string
  other_user: Profile  // joined from profiles
  unread_count: number // computed client-side
}

export type DirectMessage = {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  content: string
  attachments: Attachment[]
  edited_at: string | null
  read_at: string | null
  created_at: string
  sender: Profile  // joined
}
```

---

## Notifications — Unread Badge

Add a notification badge to the groups sidebar DM section header when any DM has unread messages:

```
✉️  DIRECT MESSAGES  [3]   ← red badge with total unread count
```

Compute this client-side from the loaded DM conversations — no separate count query needed.

---

## Permissions

DMs are available to all roles including `noob`. There are no channel restrictions for DMs — any two members of the platform can DM each other regardless of their role in any group.

Add to `lib/permissions.ts`:
```ts
canSendDMs: (role: Role) => true,  // all roles
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `get_or_create_dm` fails | Toast: "Couldn't open conversation. Try again." |
| Message send fails | Rollback optimistic message, show inline error |
| Conversation not found / unauthorized | Redirect to home |
| Other user deleted their account | Show "Deleted User" with generic avatar, messages remain |
| Real-time subscription drops | Auto-reconnect via Supabase client default behavior |

---

## Cloudflare Pages Compatibility

- All data fetching is client-side — no server routes needed
- `get_or_create_dm` is a Supabase RPC call — fully edge-compatible
- Realtime subscriptions use WebSockets — fully edge-compatible
- Dynamic import `DMConversationView` with `ssr: false` to avoid hydration issues

---

## Instructions

Apply on top of the existing codebase. Do not modify the `groups`, `channels`, or `group_members` tables or their RLS policies. Reuse `MessageList`, `MessageInput`, emoji reactions, image paste, and GIF picker components without modification — pass DM data through the same props interface. Update `schema.sql`. No new npm packages required.
