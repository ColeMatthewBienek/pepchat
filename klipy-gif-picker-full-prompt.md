# Claude Code Prompt — Robust Klipy GIF/Sticker/Meme Picker

Implement a full-featured, Discord-quality GIF, Sticker, and Meme picker using the Klipy API. This replaces the basic GIF prompt previously written. Use this as the complete and authoritative implementation guide.

---

## API Reference

**Base URL:** `https://api.klipy.com/api/v1/{API_KEY}`

The API key is embedded in the URL path, not a header.

### Environment Variable
```
NEXT_PUBLIC_KLIPY_API_KEY=your_klipy_api_key_here
```

---

## Full Endpoint Reference

### GIFs

```
GET /api/v1/{API_KEY}/gifs/trending          # trending GIFs
GET /api/v1/{API_KEY}/gifs/search?q={query}  # search GIFs
GET /api/v1/{API_KEY}/gifs/categories        # browse categories
GET /api/v1/{API_KEY}/gifs/recent/{user_id}  # user's recently used GIFs
GET /api/v1/{API_KEY}/gifs/{slug}            # single GIF by slug
POST /api/v1/{API_KEY}/gifs/share            # register a share (required by ToS)
DELETE /api/v1/{API_KEY}/gifs/recent/{user_id}/{gif_id}  # hide from recents
```

### Stickers
```
GET /api/v1/{API_KEY}/stickers/trending
GET /api/v1/{API_KEY}/stickers/search?q={query}
GET /api/v1/{API_KEY}/stickers/categories
GET /api/v1/{API_KEY}/stickers/recent/{user_id}
POST /api/v1/{API_KEY}/stickers/share
```

### Memes
```
GET /api/v1/{API_KEY}/memes/trending
GET /api/v1/{API_KEY}/memes/search?q={query}
GET /api/v1/{API_KEY}/memes/categories
```

### Search Suggestions & Autocomplete
```
GET /api/v1/{API_KEY}/search/suggestions?q={query}   # autocomplete suggestions
GET /api/v1/{API_KEY}/search/trending                # trending search terms
```

---

## Query Parameters

| Parameter | Description | Default | Notes |
|-----------|-------------|---------|-------|
| `q` | Search query string | — | Required for search endpoints |
| `per_page` | Results per page | 24 | Min 8, max 50 |
| `page` | Page number for pagination | 1 | Integer |
| `locale` | Localization code | `us_US` | Format: `xx_XX` e.g. `us_US`, `uk_UK` |
| `rating` | Content filter | `pg` | Options: `g`, `pg`, `pg-13`, `r` |

---

## Response Structure

All endpoints return:
```ts
{
  result: boolean,
  data: {
    data: KlipyItem[],     // array of GIF/sticker/meme objects
    current_page: number,
    per_page: number,
    has_next: boolean      // use this for infinite scroll
  }
}
```

### KlipyItem object
```ts
type KlipyItem = {
  id: string
  slug: string
  title: string
  files: {
    gif: { url: string, width: number, height: number, size: number }
    tinygif: { url: string, width: number, height: number }    // thumbnail
    mediumgif?: { url: string, width: number, height: number } // mid quality
    mp4?: { url: string, width: number, height: number }       // video format
    tinymp4?: { url: string }                                  // small video
  }
}
```

**Always use `tinygif.url` for grid thumbnails and `gif.url` for the sent message.** This keeps the picker fast and reduces bandwidth.

---

## lib/klipy.ts — API Wrapper

Create this file to centralize all Klipy calls:

```ts
const BASE = 'https://api.klipy.com/api/v1'
const KEY = process.env.NEXT_PUBLIC_KLIPY_API_KEY

type ContentType = 'gifs' | 'stickers' | 'memes'

interface KlipyResponse {
  result: boolean
  data: {
    data: KlipyItem[]
    current_page: number
    per_page: number
    has_next: boolean
  }
}

async function klipyFetch(path: string, signal?: AbortSignal): Promise<KlipyResponse> {
  const res = await fetch(`${BASE}/${KEY}${path}`, { signal })
  if (!res.ok) throw new Error(`Klipy API error: ${res.status}`)
  return res.json()
}

export const klipy = {
  trending: (type: ContentType, page = 1) =>
    klipyFetch(`/${type}/trending?per_page=24&page=${page}&rating=pg`),

  search: (type: ContentType, query: string, page = 1, signal?: AbortSignal) =>
    klipyFetch(`/${type}/search?q=${encodeURIComponent(query)}&per_page=24&page=${page}&rating=pg`, signal),

  categories: (type: ContentType) =>
    klipyFetch(`/${type}/categories`),

  recent: (type: ContentType, userId: string) =>
    klipyFetch(`/${type}/recent/${userId}`),

  suggestions: (query: string) =>
    klipyFetch(`/search/suggestions?q=${encodeURIComponent(query)}`),

  trendingSearches: () =>
    klipyFetch('/search/trending'),

  registerShare: async (type: ContentType, itemId: string, userId: string) => {
    // Required by Klipy ToS when user sends a GIF/sticker/meme
    await fetch(`${BASE}/${KEY}/${type}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, customer_id: userId })
    })
  },

  hideFromRecent: async (type: ContentType, userId: string, itemId: string) => {
    await fetch(`${BASE}/${KEY}/${type}/recent/${userId}/${itemId}`, {
      method: 'DELETE'
    })
  }
}
```

---

## Database Changes

No new tables. Store GIF/sticker/meme sends in the existing `messages.attachments` column:

```ts
// Attachment object for a Klipy item
type KlipyAttachment = {
  type: 'gif' | 'sticker' | 'meme'
  source: 'klipy'
  url: string        // gif.url (full quality)
  preview: string    // tinygif.url (thumbnail)
  title: string
  slug: string
  width: number
  height: number
}
```

A GIF/sticker/meme message has `content: ''` and one item in `attachments`. No text + GIF in the same message.

---

## Picker UI — Full Spec

### Trigger Button
- Add a single **GIF** button to the message input toolbar
- Clicking it opens the picker panel
- The picker supports GIFs, Stickers, and Memes via tabs — one button opens all three

### Picker Panel
Fixed size: **480px wide × 420px tall**. Floats above the message input, anchored upward.

```
┌────────────────────────────────────────┐
│ [ GIFs ] [ Stickers ] [ Memes ]        │  ← content type tabs
├────────────────────────────────────────┤
│ 🔍 Search KLIPY...                     │  ← search bar (placeholder required by ToS)
├────────────────────────────────────────┤
│ Trending: #excited #lol #omg #yes ...  │  ← trending search term chips (scrollable)
├────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │      │ │      │ │      │            │  ← 3-col thumbnail grid
│ └──────┘ └──────┘ └──────┘            │
│ ┌──────┐ ┌──────┐ ┌──────┐            │
│ └──────┘ └──────┘ └──────┘            │
│         (infinite scroll)              │
├────────────────────────────────────────┤
│                    Powered by KLIPY    │  ← required attribution
└────────────────────────────────────────┘
```

### Tabs
- Three tabs: **GIFs**, **Stickers**, **Memes**
- Active tab has indigo underline indicator
- Switching tabs resets the search query and loads trending for the new content type
- Each tab maintains independent scroll/pagination state

### Search Bar
- Placeholder text must be **"Search KLIPY"** — required by attribution guidelines
- Auto-focused when picker opens
- As user types, fetch autocomplete suggestions from `/search/suggestions?q={query}` and show as a dropdown below the input (max 5 suggestions)
- Debounce search by 300ms before firing the search API call
- Use `AbortController` to cancel in-flight requests when query changes
- On empty query: show trending content
- On no results: show "No results for '{query}'" centered

### Trending Search Chips
- Fetch from `/search/trending` once on picker mount, cache for the session
- Display as horizontally scrollable pills below the search bar
- Clicking a chip populates the search bar and triggers a search

### Recently Used Section
- When search is empty and user has previously sent GIFs/stickers/memes, show a **"Recently Used"** row above trending
- Fetch from `/gifs/recent/{supabase_user_id}` (use the Supabase user's UUID as `customer_id`)
- Each recent item has an `✕` button on hover to remove it from recents via the DELETE endpoint
- Cache recents in component state; update optimistically on removal

### Categories
- Fetch from `/gifs/categories` (and equivalent for stickers/memes)
- Display as a horizontal scrollable row of category chips above the grid when search is empty
- Clicking a category chip searches for that term
- Cache categories per content type for the session

### Thumbnail Grid
- 3-column grid using CSS Grid: `grid-template-columns: repeat(3, 1fr)`
- Use `tinygif.url` for thumbnails — never load full GIFs in the picker grid
- Each thumbnail:
  - Fixed height 100px, `object-fit: cover`
  - `border-radius: 6px`
  - On hover: animate to full GIF by swapping `src` to `gif.url` (or `mediumgif.url` if available)
  - Cursor pointer, subtle `scale(1.03)` transform on hover
  - Show title as tooltip on hover
- Skeleton loading state: gray placeholder tiles in the same grid layout while fetching

### Infinite Scroll
- Use `IntersectionObserver` on a sentinel element at the bottom of the grid
- When sentinel is visible and `has_next === true`, fetch next page and append results
- Show a small spinner at the bottom while loading more
- Do not re-fetch if already loading

---

## Sending a GIF/Sticker/Meme

When user clicks a thumbnail:
1. Call `klipy.registerShare(type, item.id, userId)` — **required by Klipy ToS**, fire-and-forget
2. Close the picker immediately
3. Optimistically append the message to the chat thread
4. Insert the message row to Supabase with `content: ''` and `attachments: [KlipyAttachment]`
5. On Supabase error: remove optimistic message, show error toast

---

## Rendering in Message Thread

### GIFs
- Render at natural size capped to max 400px wide, maintaining aspect ratio
- Autoplay inline — no controls
- Show a small **GIF** badge pill in top-left corner

### Stickers
- Render at max 200px wide (stickers are smaller by convention)
- Transparent background (stickers typically have alpha channel)
- No badge

### Memes
- Render at max 400px wide
- Show a small **MEME** badge pill in top-left corner

### All types
- Click opens the existing lightbox component
- Below each item: **"Powered by KLIPY"** in muted 10px text — required by ToS
- `loading="lazy"` on all images
- `unoptimized={true}` if using `next/image`

---

## Attribution Requirements (Klipy ToS — mandatory)

These are non-negotiable requirements from Klipy's attribution guidelines:

1. Search bar placeholder text must be **"Search KLIPY"** (exact text)
2. Display **"Powered by KLIPY"** text at the bottom of the picker panel
3. Display **"Powered by KLIPY"** below each GIF/sticker/meme in the message thread
4. Call the Share Trigger API (`POST /share`) every time a user sends a GIF, sticker, or meme

---

## Content Filtering

Use `rating=pg` as the default for all requests. This is appropriate for a general community chat app. Do not expose rating controls to users — keep it hardcoded to `pg`.

---

## Performance

- Dynamically import the entire picker component with `ssr: false`:
```tsx
const KlipyPicker = dynamic(() => import('@/components/chat/KlipyPicker'), { ssr: false })
```
- Cache trending content and categories in React state — don't re-fetch on every picker open
- Cache trending search terms for the full session
- Use `AbortController` on every search request — cancel when query changes or picker closes
- Preload `tinygif` thumbnails only; load `gif` only on hover or send

---

## Error Handling

| Scenario | Behavior |
|---|---|
| API key missing/invalid | Hide the GIF button entirely; log warning |
| Trending fetch fails | Show "Couldn't load content. Tap to retry." with retry button |
| Search fails | Show "Search unavailable. Try again." |
| Share trigger fails | Silently fail — don't block the message send |
| Recent items fetch fails | Skip the recents section silently |
| Picker opened offline | Show offline state with a wifi-off icon |

---

## Cloudflare Pages Compatibility

- All Klipy calls are client-side (`NEXT_PUBLIC_` key in URL) — no API routes needed
- Use Web `fetch` only — no Node.js `https` module
- `AbortController` works on Cloudflare edge — safe to use
- Dynamic import with `ssr: false` is required — do not attempt SSR of the picker

---

## Instructions

Apply on top of the existing codebase. This supersedes the earlier basic GIF prompt. Do not install any GIF picker libraries — build the picker UI entirely from scratch per the spec above. The only new dependency allowed is nothing — use the native `fetch` API for all Klipy calls.

Update `.env.local.example` to include `NEXT_PUBLIC_KLIPY_API_KEY`.
