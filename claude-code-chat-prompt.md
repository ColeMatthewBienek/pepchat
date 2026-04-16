# Claude Code Prompt — Discord-Light Chat App

---

## OBJECTIVE

Build a fully functional real-time chat application — a Discord-light clone with live messaging, multiple groups (servers), and multiple channels per group. No voice channels. Web-only. Deploy to Cloudflare Pages.

---

## TECH STACK

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/DB**: Supabase (Postgres + Realtime + Auth + Storage)
- **Deployment**: Cloudflare Pages (use `@cloudflare/next-on-pages`)
- **Auth**: Supabase Auth (email/password + optional OAuth)

---

## DATABASE SCHEMA

Create the following tables in Supabase. Generate a single `schema.sql` file with all table definitions, RLS policies, and indexes.

```sql
-- Users are managed by Supabase Auth (auth.users)
-- Extend with a public profiles table

profiles
  id          uuid references auth.users(id) primary key
  username    text unique not null
  avatar_url  text
  created_at  timestamptz default now()

groups
  id          uuid primary key default gen_random_uuid()
  name        text not null
  description text
  icon_url    text
  owner_id    uuid references profiles(id) not null
  invite_code text unique default substr(md5(random()::text), 0, 9)
  created_at  timestamptz default now()

group_members
  id         uuid primary key default gen_random_uuid()
  group_id   uuid references groups(id) on delete cascade
  user_id    uuid references profiles(id) on delete cascade
  role       text default 'member' -- 'owner' | 'admin' | 'member'
  joined_at  timestamptz default now()
  unique(group_id, user_id)

channels
  id          uuid primary key default gen_random_uuid()
  group_id    uuid references groups(id) on delete cascade
  name        text not null
  description text
  position    int default 0
  created_at  timestamptz default now()

messages
  id          uuid primary key default gen_random_uuid()
  channel_id  uuid references channels(id) on delete cascade
  user_id     uuid references profiles(id) on delete cascade
  content     text not null
  edited_at   timestamptz
  created_at  timestamptz default now()

direct_messages
  id           uuid primary key default gen_random_uuid()
  sender_id    uuid references profiles(id)
  recipient_id uuid references profiles(id)
  content      text not null
  read_at      timestamptz
  created_at   timestamptz default now()
```

**Row Level Security rules to implement:**
- Users can only read messages in channels that belong to groups they are members of
- Users can only insert messages as themselves
- Users can only edit/delete their own messages
- Group owners and admins can manage channels
- Anyone can read a group by invite_code (for joining)

---

## CORE FEATURES TO BUILD

### 1. Authentication
- Sign up with email + password
- Login / logout
- Username selection on first login (stored in `profiles`)
- Protected routes — redirect to `/login` if not authenticated

### 2. Layout (Discord-style 3-panel)
```
[ Groups sidebar ] [ Channels sidebar ] [ Chat area ]
     80px wide          240px wide          flex-1
```

- **Groups sidebar** (left, narrow): icon/avatar for each group the user belongs to, plus a "+" button to create or join a group
- **Channels sidebar** (middle): list of channels in the selected group, group name at top, settings gear for group owners
- **Chat area** (right): message history + input box at bottom

### 3. Groups (Servers)
- Create a group (name, optional icon upload to Supabase Storage)
- Join a group via invite code
- Leave a group
- Delete a group (owner only)
- Generate and display shareable invite link

### 4. Channels
- Create text channels within a group (admin/owner only)
- Delete channels (admin/owner only)
- Reorder channels (drag or up/down buttons, saved to `position` field)
- Default channel created automatically when group is created (name: "general")

### 5. Real-Time Messaging
- Send messages in a channel
- Messages load with pagination (fetch last 50 on mount, load more on scroll up)
- New messages arrive via Supabase Realtime subscription — no page refresh needed
- Show sender avatar, username, timestamp
- Group consecutive messages from same user (compact mode — no repeated avatar/name)
- Edit own messages (inline edit on double-click or edit button)
- Delete own messages (with confirmation)
- Typing indicator — show "[username] is typing..." using Supabase Realtime Presence

### 6. Presence / Online Status
- Use Supabase Realtime Presence to track who is online in a channel
- Show a green dot on user avatars when online
- Show member list panel (collapsible) on right side of chat area

### 7. Direct Messages (stretch goal — stub it if time is short)
- DM list in the groups sidebar below the group icons
- 1:1 real-time messaging using the `direct_messages` table
- Unread indicator

---

## UI / UX REQUIREMENTS

- **Color scheme**: Dark theme by default (Discord-inspired). Use CSS variables so it can be themed. Suggested palette:
  - Background primary: `#1e1f22`
  - Background secondary: `#2b2d31`
  - Background tertiary: `#313338`
  - Accent: `#5865f2` (indigo)
  - Text primary: `#f2f3f5`
  - Text muted: `#949ba4`

- **Font**: Inter (Google Fonts or next/font)
- **Responsive**: functional on mobile (sidebar collapses to bottom nav or hamburger)
- **Animations**: subtle — message fade-in, sidebar hover states
- **No external UI libraries** (no shadcn, no MUI) — build components from scratch with Tailwind so there are no dependency conflicts on Cloudflare Pages

---

## PROJECT STRUCTURE

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← 3-panel layout with auth guard
│   │   ├── channels/
│   │   │   └── [channelId]/page.tsx
│   │   └── dm/
│   │       └── [userId]/page.tsx
│   └── layout.tsx              ← root layout, Supabase provider
├── components/
│   ├── sidebar/
│   │   ├── GroupsSidebar.tsx
│   │   └── ChannelsSidebar.tsx
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── Message.tsx
│   │   └── TypingIndicator.tsx
│   ├── modals/
│   │   ├── CreateGroupModal.tsx
│   │   ├── JoinGroupModal.tsx
│   │   └── CreateChannelModal.tsx
│   └── ui/
│       ├── Avatar.tsx
│       ├── Button.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← browser client
│   │   ├── server.ts           ← server client (for server components)
│   │   └── middleware.ts       ← auth session refresh
│   ├── hooks/
│   │   ├── useMessages.ts      ← fetch + realtime subscription
│   │   ├── usePresence.ts      ← online status
│   │   └── useGroups.ts
│   └── types.ts                ← TypeScript interfaces matching DB schema
├── schema.sql                  ← full DB setup script
├── middleware.ts               ← Next.js middleware for auth
├── next.config.js
├── wrangler.toml               ← Cloudflare Pages config
└── .env.local.example
```

---

## ENVIRONMENT VARIABLES

Create `.env.local.example` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## CLOUDFLARE PAGES DEPLOYMENT SETUP

- Use `@cloudflare/next-on-pages` adapter
- Add `wrangler.toml` with correct configuration
- Ensure all dynamic routes use Edge Runtime (`export const runtime = 'edge'`)
- Add a `pages:build` and `pages:deploy` script to `package.json`
- Note any known limitations (no Node.js APIs, use Web APIs only)

---

## IMPLEMENTATION ORDER

Build in this sequence so there's always something working at each step:

1. Project scaffold — Next.js + Tailwind + Supabase client setup
2. Auth flow — signup, login, profile creation
3. Database schema — run `schema.sql`, verify in Supabase dashboard
4. Static layout — 3-panel shell with hardcoded placeholder data
5. Groups — create, list, join via invite code
6. Channels — create, list within a group
7. Messaging — send, fetch history, display
8. Realtime — subscribe to new messages, live updates
9. Presence — typing indicators, online status
10. Polish — pagination, edit/delete messages, mobile layout
11. Cloudflare Pages config — wrangler, edge runtime, deploy scripts

---

## CODING STANDARDS

- TypeScript strict mode throughout
- No `any` types — define proper interfaces in `lib/types.ts`
- Use React Server Components where possible, Client Components only where interactivity requires it (mark with `'use client'`)
- Supabase calls in server components use the server client; browser subscriptions use the browser client
- Handle loading and error states in every data-fetching component
- Use optimistic updates for message sending (append immediately, rollback on error)
- Add JSDoc comments on all exported functions and hooks

---

## DELIVERABLES CHECKLIST

Before considering this done, verify:
- [ ] User can sign up, log in, log out
- [ ] User can create a group and see it in the sidebar
- [ ] User can create channels within a group
- [ ] User can share an invite link and another account can join
- [ ] Messages send and appear in real time without refresh
- [ ] Typing indicator appears when another user is typing
- [ ] Online presence dots update live
- [ ] Edit and delete own messages works
- [ ] App loads and functions correctly on Cloudflare Pages
- [ ] No TypeScript errors (`tsc --noEmit` passes clean)
- [ ] `schema.sql` can be run on a fresh Supabase project to fully recreate the DB

---

*Start with Step 1 — scaffold the project and confirm the Supabase connection works before moving on.*
