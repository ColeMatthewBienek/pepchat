# Claude Code Prompt — GIF Picker (Klipy API)

Add a Discord-style GIF picker to the chat input using the Klipy API. Users can search for GIFs, browse trending content, and send a GIF as a message. GIFs render inline in the message thread.

---

## Why Klipy

- Giphy API now costs ~$9K/year — not viable
- Tenor API is being fully shut down by Google in June 2026 — do not use it
- Klipy is free, built by the original Tenor engineering team, and already adopted by WhatsApp and Discord
- API structure is near-identical to Tenor — simple integration

**Get a free API key at:** https://klipy.com

---

## Environment Variable

Add to `.env.local` and `.env.local.example`:

```
NEXT_PUBLIC_KLIPY_API_KEY=your_klipy_api_key_here
```

---

## API Integration

Base URL: `https://api.klipy.com/v1`

Key endpoints to use:

```ts
// Trending GIFs (shown on picker open)
GET https://api.klipy.com/v1/gifs/trending?api_key={key}&limit=24

// Search GIFs
GET https://api.klipy.com/v1/gifs/search?api_key={key}&q={query}&limit=24

// Trending search terms (show as chips below search bar)
GET https://api.klipy.com/v1/trending/searches?api_key={key}&limit=10
```

Accessing the GIF URL from a result object:
```ts
const gifUrl = result.files.gif.url        // full quality
const previewUrl = result.files.tinygif.url // small preview for grid thumbnails
```

Create `lib/klipy.ts` to wrap all API calls:
```ts
const KLIPY_BASE = 'https://api.klipy.com/v1'
const API_KEY = process.env.NEXT_PUBLIC_KLIPY_API_KEY

export async function fetchTrendingGifs(limit = 24) { ... }
export async function searchGifs(query: string, limit = 24) { ... }
export async function fetchTrendingSearches(limit = 10) { ... }
```

All fetch calls must use `{ next: { revalidate: 60 } }` cache hints where applicable.

---

## Database Changes

No new tables needed. GIFs are sent as messages using the existing `attachments` column on `messages`:

```ts
// A GIF attachment object
{
  url: string      // full Klipy GIF URL
  type: 'gif'      // distinguishes from uploaded images
  name: string     // GIF title from Klipy response
  preview: string  // tinygif URL for thumbnail display
  width: number
  height: number
  source: 'klipy'  // for attribution
}
```

A GIF message has no text content — `content` is an empty string `''` and `attachments` contains one GIF object. Do not allow sending a GIF + text in the same message (GIF replaces the text input when selected).

Update `schema.sql` comments to note that `attachments` supports both `'image'` and `'gif'` types.

---

## GIF Picker UI

### Trigger
- Add a GIF button to the message input toolbar (label: **GIF** in small bold text, or use a GIF icon)
- Sits alongside the paperclip (image) button and emoji button
- Clicking it toggles the GIF picker open/closed
- Picker closes when: clicking outside, pressing Escape, or after a GIF is selected and sent

### Picker layout
The picker is a floating panel anchored above the message input, opening upward. Fixed size: **480px wide × 380px tall**.

```
┌─────────────────────────────────────┐
│ 🔍 Search GIFs...                   │
├─────────────────────────────────────┤
│ Trending: #excited  #lol  #yes  ... │
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │      │ │      │ │      │         │
│ │  GIF │ │  GIF │ │  GIF │         │
│ └──────┘ └──────┘ └──────┘         │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │      │ │      │ │      │         │
│ └──────┘ └──────┘ └──────┘         │
│            (scrollable)             │
└─────────────────────────────────────┘
```

### Search bar
- Auto-focused when picker opens
- Debounce search input by 300ms before firing API call
- While loading: show a subtle skeleton grid (same grid layout, gray placeholder tiles)
- On empty query: show trending GIFs
- On no results: show "No GIFs found for '{query}'" centered in the grid area

### Trending search chips
- Show below the search bar as horizontally scrollable pills: `#excited` `#lol` `#yes` etc.
- Clicking a chip populates the search bar and triggers a search for that term
- Fetch from the trending searches endpoint on picker open, cache the result for the session

### GIF grid
- 3-column masonry-style grid using CSS columns or a simple fixed-height grid
- Use `previewUrl` (tinygif) for thumbnails to keep the picker fast
- Each thumbnail:
  - Rounded corners (`border-radius: 6px`)
  - Plays on hover (GIFs autoplay on hover via mouse enter, pause on mouse leave — swap `src` between static poster and animated gif)
  - Cursor pointer
  - Subtle scale transform on hover (`scale(1.03)`)
- Infinite scroll or a "Load more" button at the bottom (prefer infinite scroll with an IntersectionObserver)
- Show max 24 GIFs per page, load 24 more on scroll

### Selecting a GIF
- Clicking a GIF immediately:
  1. Closes the picker
  2. Sends the message with the GIF as an attachment (do not require the user to press Enter)
  3. Shows an optimistic message in the thread while the Supabase insert completes

---

## Rendering GIFs in the Message Thread

GIF messages render differently from image messages:

- Display the full GIF (use `gifUrl`, not `previewUrl`) at max 300px wide, maintaining aspect ratio
- GIFs autoplay automatically inline (no controls, no click-to-play)
- Show a small **GIF** badge pill in the top-left corner of the rendered GIF so it's visually distinct from uploaded images
- Clicking the GIF opens the lightbox (reuse the existing lightbox component from the image paste feature)
- No download button for GIFs in the lightbox (Klipy attribution requirement)
- Below the GIF, show a tiny **Powered by Klipy** attribution text in muted color — this is required by Klipy's terms of service

---

## Performance

- Use `loading="lazy"` on all GIF `<img>` elements in the picker grid
- Do not load the Klipy API module until the GIF picker is first opened (lazy load the picker component):
```tsx
const GifPicker = dynamic(() => import('./GifPicker'), { ssr: false })
```
- Cache trending GIFs in React state for the session — don't re-fetch on every picker open
- Abort in-flight search requests when the query changes (use `AbortController`)

---

## Permissions

- `noob` — can send GIFs in the `welcome` channel only (same rule as messages, enforced at RLS level)
- `user`, `moderator`, `admin` — can send GIFs in any accessible channel

Add to `lib/permissions.ts`:
```ts
canSendGifs: (role: Role) => ['admin', 'moderator', 'user', 'noob'].includes(role),
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Klipy API key missing | Hide GIF button entirely, log warning to console |
| API request fails | Show "Couldn't load GIFs. Try again." with a retry button in the picker |
| API rate limited | Same as above — do not expose rate limit details to the user |
| GIF send fails | Show error toast, remove optimistic message |
| Picker opened with no internet | Show offline error state in picker |

---

## Cloudflare Pages Compatibility

- All Klipy API calls are client-side (`NEXT_PUBLIC_` key) — no server routes needed
- Dynamic import the GifPicker component with `ssr: false`
- Use the Web `fetch` API only — no Node.js `https` module
- `AbortController` is available on the edge runtime — safe to use

---

## Attribution Requirement

Klipy requires attribution. Display **"Powered by Klipy"** in muted small text:
- Inside the GIF picker (bottom of the panel)
- Below each GIF rendered in the message thread

This is a terms of service requirement — do not omit it.

---

## Instructions

Apply on top of the existing codebase without breaking any existing functionality. Do not install any additional npm packages beyond what is needed for the API fetch calls (no GIF picker libraries — build the picker UI from scratch as specified above).
