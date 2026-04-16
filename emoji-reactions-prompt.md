# Claude Code Prompt — Emoji Reactions

Add emoji reactions to messages with the following spec:

---

## Overview

Users can react to any message with an emoji. Reactions are grouped and displayed below the message. Clicking an existing reaction toggles your own reaction on/off. Multiple users can share the same reaction and the count updates live.

---

## Database

Add this table:

```sql
message_reactions
  id          uuid primary key default gen_random_uuid()
  message_id  uuid references messages(id) on delete cascade not null
  user_id     uuid references profiles(id) on delete cascade not null
  emoji       text not null
  created_at  timestamptz default now()
  unique(message_id, user_id, emoji)
```

RLS policies:
- Any group member can select reactions on messages in channels they have access to
- Users can insert reactions as themselves only (`user_id = auth.uid()`)
- Users can delete their own reactions only
- Noob role follows the same channel restriction as messages — can only react in the `welcome` channel

---

## Core Behavior

- Reactions are grouped by emoji — show each unique emoji once with a count of how many users reacted with it
- If the current user has reacted with that emoji, highlight that reaction pill (indigo background, white text)
- Clicking a highlighted reaction removes it (DELETE). Clicking an unhighlighted reaction adds it (INSERT)
- Maximum 20 unique emoji per message — if a message already has 20 distinct emoji, the picker disables adding new ones (existing reactions can still be toggled)
- Users can only add one of each emoji per message (enforced by the unique constraint)
- A user can react with multiple different emoji on the same message

---

## Emoji Library

Install and use `emoji-mart`:

```bash
npm install @emoji-mart/react @emoji-mart/data
```

Implementation:

```tsx
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

<Picker
  data={data}
  onEmojiSelect={(emoji) => handleReaction(emoji.native)}
  theme="dark"
  set="native"
  previewPosition="none"
  skinTonePosition="none"
  maxFrequentRows={2}
/>
```

- Use the `native` emoji set so no external CDN is needed — renders using the OS emoji font
- Set `theme="dark"` to match the app's dark theme
- Disable the preview bar (`previewPosition="none"`) to keep the picker compact
- Show frequent/recently used emoji at the top (`maxFrequentRows={2}`)
- The picker supports search, category tabs, and skin tone selection out of the box — leave all of these enabled
- Store the selected `emoji.native` value (the actual unicode character) in the database, not a shortcode

---

## Emoji Picker UI

- Appears on message hover — show a smiley face `😊` icon button in the message action bar alongside edit/delete
- Clicking opens the emoji-mart picker in a floating popover anchored to the message, opening upward if near the bottom of the viewport
- Picker closes on outside click or after selecting an emoji
- Use a `useRef` + `useEffect` click-outside listener to handle dismissal — do not use any popover library

---

## Realtime

- Subscribe to INSERT and DELETE events on `message_reactions` filtered by `channel_id` (join through messages)
- Reactions update live for all users in the channel without a page refresh
- Optimistic update: apply the reaction change instantly in local state, then sync with DB result. Roll back on error.

---

## UI Spec — Reaction Pills

- Reaction pills sit below the message content, above any spacing between messages
- Pill style: `rounded-full`, small padding, 13px font size, 1px border
  - Default (not reacted by current user): `bg-transparent border-border text-muted`
  - Reacted by current user: `bg-indigo-500/20 border-indigo-400 text-indigo-300`
- Display format: `👍 3`
- Remove the pill entirely when count drops to 0
- Hover tooltip on each pill lists usernames who reacted — show max 5 names then `+ N more`
- No empty space rendered when a message has zero reactions

---

## Permissions

- `noob` — can react in `welcome` channel only, enforced at RLS level
- `user`, `moderator`, `admin` — can react in any accessible channel

Add to `lib/permissions.ts`:

```ts
canReact: (role: Role) => ['admin', 'moderator', 'user', 'noob'].includes(role),
```

---

## Cloudflare Pages Compatibility

`@emoji-mart/react` is a client component — make sure the Picker is wrapped in a `'use client'` component and dynamically imported to avoid SSR issues:

```tsx
const EmojiPicker = dynamic(() => import('./EmojiPicker'), { ssr: false })
```

---

## Instructions

Update `schema.sql` to include the `message_reactions` table and all RLS policies. Apply on top of the existing codebase without breaking any existing functionality.
