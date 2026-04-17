# Claude Code Prompt — Paste Images into Chat

Add the ability to paste images directly into the chat input, upload them to Supabase Storage, and display them inline in the message thread — exactly like Discord's image paste behavior.

---

## Overview

Users can paste an image from their clipboard (Ctrl+V), drag and drop an image file onto the chat input, or click an attach button to select a file. The image is uploaded to Supabase Storage and the resulting public URL is stored with the message. Images render inline in the message thread with a lightbox on click.

---

## Supabase Storage Setup

Create a storage bucket called `chat-images`:

```sql
-- Run in Supabase SQL editor
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true);
```

Storage RLS policies:
- Any authenticated user can upload to `chat-images/` — scoped to their own user folder: `chat-images/{user_id}/{filename}`
- Anyone can read/download from the bucket (public bucket)
- Users can only delete their own files (`owner = auth.uid()`)

---

## Database Changes

Add an `attachments` column to the `messages` table:

```sql
alter table messages
  add column attachments jsonb default '[]'::jsonb;
```

Each attachment object in the array:
```ts
type Attachment = {
  url: string        // public Supabase Storage URL
  type: 'image'      // extensible for future file types
  name: string       // original filename
  size: number       // file size in bytes
  width?: number     // image dimensions (populated client-side before upload)
  height?: number
}
```

Update `schema.sql` to reflect this change.

---

## Upload Behavior

### Triggers — three ways to attach an image:
1. **Paste** — user presses Ctrl+V while the chat input is focused and the clipboard contains an image
2. **Drag and drop** — user drags an image file onto the message input area
3. **File picker** — clicking a paperclip `📎` icon button in the input toolbar opens a file input (`accept="image/*"`)

### Validation:
- Accepted types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Max file size: **8MB** per image
- Max **4 images** per message
- If validation fails, show an inline error below the input — do not use `alert()`
- Animated GIFs must be preserved — do not re-encode or compress

### Upload flow:
1. On image selection/paste/drop, generate a local object URL and show a preview immediately in the input area (below the text input)
2. Upload to Supabase Storage at path `chat-images/{user_id}/{uuid}-{filename}` using the Supabase JS client
3. Show a upload progress indicator on each image preview (a thin progress bar or spinner overlay)
4. On upload success, replace the local object URL with the permanent Supabase Storage public URL
5. On send, include all successfully uploaded attachment URLs in the `attachments` column of the message row
6. If an upload fails, show an error state on that specific preview with a retry button
7. Users can remove a pending image before sending by clicking an `✕` on the preview

### Do not block sending:
- If the user has typed text and attached images, both are sent together in one message row
- A message can be images only (no text required) or text only — both are valid

---

## Display in Message Thread

### Image rendering rules:
- Images render below the message text content (if any)
- Single image: render at max 400px wide, maintaining aspect ratio, max height 300px
- Multiple images (2–4): render in a CSS grid
  - 2 images: side by side, each 50% width
  - 3 images: first image full width, two below side by side
  - 4 images: 2x2 grid
- Images are rounded (`border-radius: 8px`) with a subtle border
- Animated GIFs autoplay inline (no controls needed)

### Lightbox:
- Clicking any image opens a fullscreen lightbox overlay
- Lightbox shows the image at its natural size (capped to viewport)
- Click outside or press `Escape` to close
- If multiple images in the message, show left/right arrows to navigate between them
- Build the lightbox from scratch — do not install a lightbox library

### Lazy loading:
- Add `loading="lazy"` to all message images
- Use `next/image` with `unoptimized={true}` for Supabase Storage URLs (Cloudflare Pages does not support Next.js image optimization)

---

## Input Area UI Changes

### Image preview strip:
- Sits between the text input and the send button row
- Each preview is a 72x72px thumbnail with:
  - The image as background
  - A circular `✕` button in the top-right corner to remove it
  - An upload progress overlay (semi-transparent dark overlay with a spinner or progress bar)
  - A green checkmark overlay when upload is complete
  - A red error overlay with a `↺` retry button if upload failed
- Strip only renders when at least one image is pending

### Drag and drop:
- When a file is dragged over the chat area, show a full-panel drop zone overlay: dashed border, `Drop image here` label centered
- Overlay dismisses when drag leaves or file is dropped
- Only activate for `image/*` MIME types — ignore non-image drags

### Paperclip button:
- Add a `📎` icon button to the left of the text input
- Clicking it triggers a hidden `<input type="file" accept="image/*" multiple>` (max 4 files)
- Style consistently with other input toolbar buttons

---

## Realtime

No changes needed — images are stored as part of the `messages` row. The existing Realtime subscription on `messages` will automatically deliver new messages with their `attachments` payload to all subscribers.

---

## Permissions

- `noob` — can paste/send images in the `welcome` channel only (same rule as text messages, enforced at RLS level)
- `user`, `moderator`, `admin` — can send images in any accessible channel

Add to `lib/permissions.ts`:

```ts
canSendImages: (role: Role) => ['admin', 'moderator', 'user', 'noob'].includes(role),
```

(Noob channel restriction is enforced at RLS level, not here.)

---

## Cloudflare Pages Compatibility

- Use `unoptimized={true}` on all `next/image` components pointing to Supabase Storage URLs
- The Supabase JS storage client uses `fetch` under the hood — fully compatible with the edge runtime
- Do not use any Node.js `fs` or `Buffer` APIs for image handling — use the Web `File` and `Blob` APIs only
- Dynamic import the lightbox component to avoid SSR issues:

```tsx
const Lightbox = dynamic(() => import('./Lightbox'), { ssr: false })
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| File too large (>8MB) | Inline error: "Image must be under 8MB" |
| Wrong file type | Inline error: "Only JPEG, PNG, GIF, and WebP are supported" |
| Too many images (>4) | Inline error: "Maximum 4 images per message" |
| Upload fails | Error overlay on preview with retry button |
| Storage bucket missing | Console error + inline error: "Image upload unavailable" |
| Paste with no image in clipboard | Silently ignore — do not show an error |

---

## Instructions

Apply on top of the existing codebase without breaking any existing functionality. Update `schema.sql` to include the `attachments` column on `messages`. Create the `chat-images` storage bucket and its RLS policies as part of the setup instructions in the README.
