# Claude Code Prompt — User Profiles

Add moderately robust user profiles to the chat app. Users can upload an avatar, choose a custom username color, and fill out personal details about themselves. Profiles are viewable by clicking on any user's avatar or username in the chat.

---

## Database Changes

Expand the existing `profiles` table:

```sql
alter table profiles
  add column if not exists display_name     text,
  add column if not exists bio              text,
  add column if not exists location         text,
  add column if not exists website          text,
  add column if not exists username_color   text default '#ffffff',
  add column if not exists banner_color     text default '#5865f2',
  add column if not exists badge            text,
  add column if not exists pronouns         text,
  add column if not exists member_since     timestamptz default now(),
  add column if not exists updated_at       timestamptz default now();
```

Field rules:
- `display_name` — optional friendly name shown instead of `username` in chat if set. Max 32 chars.
- `bio` — free text about the user. Max 190 chars.
- `location` — optional city/region string. Max 64 chars.
- `website` — optional URL. Validate format before saving. Max 100 chars.
- `username_color` — hex color string (e.g. `#ff6b6b`). Applied to the username label in chat messages.
- `banner_color` — solid color for the profile card header banner. Hex string.
- `badge` — a single optional flair badge selected from a preset list (see below).
- `pronouns` — optional free text. Max 40 chars.
- `member_since` — set once on profile creation, never updated.
- `updated_at` — updated via trigger on every profile save.

Create an `updated_at` trigger:
```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();
```

RLS policies:
- Any authenticated user can read any profile (SELECT)
- Users can only update their own profile (`id = auth.uid()`)
- Avatar storage: user can upload to `avatars/{user_id}/` path only

Update `schema.sql` to reflect all changes.

---

## Supabase Storage — Avatar Bucket

Create an `avatars` storage bucket:

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);
```

Storage RLS:
- Public read access on all files
- Authenticated users can upload/update only within `avatars/{their_user_id}/`
- Users can delete only their own avatar file

Avatar upload path: `avatars/{user_id}/avatar.{ext}` — overwrite on update, don't accumulate versions.

---

## Profile Fields — Full Spec

### Avatar
- Accepted formats: JPEG, PNG, WebP, GIF (animated GIFs allowed)
- Max size: 4MB
- Display sizes used throughout the app:
  - Small (message list): 32×32px, rounded-full
  - Medium (member list): 40×40px, rounded-full
  - Large (profile card): 80×80px, rounded-full
- If no avatar set: generate an initial-based avatar using the first letter of `display_name` or `username`, rendered as a colored circle (derive color from username hash for consistency)

### Display Name
- Optional. If set, shown instead of `username` everywhere in the UI.
- Username always shown below display name in smaller muted text on the profile card.
- Max 32 characters.

### Username Color
- User picks a color for how their username/display name appears in chat messages.
- Provide a color picker with:
  - A palette of 18 preset colors (Discord-inspired: white, red, orange, yellow, green, teal, blue, indigo, pink, plus softer pastel variants of each)
  - A hex input field for custom colors
  - A live preview showing "YourName" in the selected color
- Enforce minimum contrast against the dark background (`#313338`) — if contrast ratio is below 3:1, show a warning: "This color may be hard to read" but still allow saving.
- Default: `#ffffff`

### Profile Banner
- A solid color banner shown at the top of the profile card (no image upload — color only)
- Same color picker UX as username color
- Default: `#5865f2` (indigo)

### Badge (flair)
- One optional badge selected from this preset list:
  - 🧪 Researcher
  - 🔥 OG Member
  - 💎 Supporter
  - 🎨 Creative
  - 🛠️ Builder
  - 🌍 Globetrotter
  - 🎮 Gamer
  - 📚 Bookworm
  - 🏋️ Lifter
  - 🤖 Tech Nerd
  - 👑 Legend
  - ⚡ Early Adopter
- Displayed as an emoji + label pill on the profile card
- Admin can assign any badge to any user (using the existing role management panel)
- Users can assign themselves any badge from the list except 👑 Legend and ⚡ Early Adopter (admin-only badges)
- Selecting "None" clears the badge

### Bio
- Textarea, max 190 characters
- Show character counter (e.g. `142 / 190`)
- No markdown — plain text only
- Renders with whitespace preserved (`whitespace-pre-wrap`)

### Pronouns
- Free text input, max 40 chars
- Shown on profile card below the display name/username

### Location
- Free text, max 64 chars
- Show a 📍 pin icon before the text on the profile card

### Website
- Text input with URL validation (must start with `http://` or `https://`)
- Shown as a clickable link with 🔗 icon on the profile card
- Open in new tab (`target="_blank" rel="noopener noreferrer"`)

---

## Profile Card (View Mode)

Shown when clicking any user's avatar or username anywhere in the app. Appears as a floating popover/modal anchored near the click point, repositioned if near screen edges.

```
┌──────────────────────────────────┐
│  [  banner color fill — 72px  ] │
│       ┌────────┐                 │
│       │ avatar │  DisplayName    │
│       └────────┘  @username      │
│                   she/her  🛠️ Builder │
├──────────────────────────────────┤
│  Living life one commit at a time│  ← bio
│                                  │
│  📍 Seattle, WA                  │
│  🔗 mysite.dev                   │
│  Member since April 2025         │
├──────────────────────────────────┤
│  [  Send Message  ]  [ ··· ]     │  ← actions
└──────────────────────────────────┘
```

Card details:
- Banner: 72px tall solid color block at top
- Avatar overlaps the banner bottom edge by half (36px overlap)
- Display name in 16px bold, username in 13px muted
- Pronouns and badge shown inline on same row as username, separated by `·`
- Bio rendered with `whitespace-pre-wrap`
- "Member since" formatted as `Month YYYY`
- "Send Message" button — opens DM with that user (stub if DM not yet built)
- `···` button — shows options: Copy Username, Report User (stub)
- Card closes on outside click or Escape
- Do not show the card when clicking your own avatar — go straight to Edit Profile instead
- Build with `useRef` + `useEffect` for outside-click dismissal — no popover library

---

## Edit Profile Page / Modal

Accessible via:
- Clicking your own avatar anywhere in the app
- User settings icon (gear) in the bottom-left of the groups sidebar
- Route: `/settings/profile`

Layout: a settings-style page (not a modal) with a live preview panel on the right.

```
┌───────────────────┬──────────────────────┐
│   EDIT PROFILE    │   PREVIEW            │
│                   │                      │
│ Avatar            │  [profile card       │
│ [upload / remove] │   live preview       │
│                   │   updates as you     │
│ Display Name      │   type]              │
│ [____________]    │                      │
│                   │                      │
│ Username Color    │                      │
│ [color picker]    │                      │
│                   │                      │
│ Banner Color      │                      │
│ [color picker]    │                      │
│                   │                      │
│ Badge             │                      │
│ [badge selector]  │                      │
│                   │                      │
│ Pronouns          │                      │
│ [____________]    │                      │
│                   │                      │
│ Bio               │                      │
│ [______________]  │                      │
│ [______________]  │                      │
│ 142 / 190         │                      │
│                   │                      │
│ Location          │                      │
│ [____________]    │                      │
│                   │                      │
│ Website           │                      │
│ [____________]    │                      │
│                   │                      │
│ [ Save Changes ]  │                      │
│ [ Cancel ]        │                      │
└───────────────────┴──────────────────────┘
```

UX rules:
- All fields update the live preview in real time as the user types/picks
- "Save Changes" is disabled until at least one field has changed from the saved state
- Show a success toast on save: "Profile updated"
- Show field-level validation errors inline (not via alert)
- Avatar upload: clicking the avatar in the edit panel opens a file picker. After selection, show a circular crop preview immediately. Upload happens on "Save Changes", not immediately on selection.
- "Remove avatar" link appears below avatar if one is set

---

## Avatar Upload — Crop Flow

On avatar file selection:
1. Open a simple circular crop modal
2. Show the selected image with drag-to-reposition
3. Crop is always 1:1 aspect ratio, circular mask preview
4. "Apply" button closes the crop modal and shows the cropped preview in the edit panel
5. On save, upload the cropped image blob to Supabase Storage
6. Use the browser's native `Canvas` API for cropping — do not install a crop library

---

## Integration Points — Apply Everywhere

Once profiles are built, apply throughout the existing codebase:

### Chat Messages
- Username label uses `profile.username_color` as its CSS `color`
- If `display_name` is set, show it as the primary name; show `@username` on hover as tooltip
- Clicking the username or avatar opens the profile card popover

### Member List Panel
- Show avatar (or initial avatar), display name, and online status dot
- Clicking a member opens their profile card

### Groups Sidebar
- Bottom-left: show the current user's own avatar + display name (truncated)
- Clicking it navigates to `/settings/profile`

### Direct Messages List
- Show the other user's avatar and display name

---

## TypeScript Types

Add to `lib/types.ts`:

```ts
export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  username_color: string
  banner_color: string
  badge: string | null
  pronouns: string | null
  member_since: string
  updated_at: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'username' | 'member_since' | 'updated_at'>>
```

---

## New Components

```
components/
  profile/
    ProfileCard.tsx          ← floating popover view
    ProfileCardContent.tsx   ← inner content (reused in card and page preview)
    EditProfilePage.tsx      ← /settings/profile page
    AvatarCropModal.tsx      ← canvas-based crop flow
    ColorPicker.tsx          ← shared color picker (preset palette + hex input)
    BadgeSelector.tsx        ← badge grid selector
    InitialAvatar.tsx        ← fallback avatar from username initial
```

---

## Route

Add `/settings/profile` as a protected route under the `(app)` layout group.

---

## Cloudflare Pages Compatibility

- Canvas API is available in the browser — safe to use for avatar cropping
- Do not use any Node.js `sharp` or `canvas` packages — browser Canvas only
- Dynamic import `EditProfilePage` and `AvatarCropModal` with `ssr: false` to avoid SSR issues with canvas
- All Supabase storage calls are client-side — no server routes needed

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Avatar too large (>4MB) | Inline error: "Avatar must be under 4MB" |
| Wrong avatar format | Inline error: "Please use JPEG, PNG, WebP, or GIF" |
| Bio too long | Disable save, show red character counter |
| Invalid website URL | Inline error: "Please enter a valid URL starting with https://" |
| Save fails (network) | Toast error: "Couldn't save profile. Try again." |
| Avatar upload fails | Toast error: "Avatar upload failed. Profile text saved." |
| Profile not found | Show skeleton/placeholder state in the profile card |

---

## Instructions

Apply on top of the existing codebase without breaking any existing functionality. Update `schema.sql`. Do not install any new npm packages — use browser-native APIs (Canvas, fetch, FileReader) for all profile functionality. The color picker, badge selector, and crop modal must all be built from scratch with Tailwind.
