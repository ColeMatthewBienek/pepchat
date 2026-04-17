# Claude Code Prompt — Mobile UI/UX Optimization

Fully optimize the chat app for mobile devices. The current layout breaks on screens under 768px — panels overlap, the DM section is unreachable, and touch targets are too small. Fix all of this without touching desktop behavior.

---

## Breakpoints

- **Mobile**: `< 768px` — single panel, slide-in drawer navigation
- **Tablet**: `768px – 1023px` — 2-panel (drawer + chat)
- **Desktop**: `>= 1024px` — full 3-panel layout, no changes

Use Tailwind responsive prefixes (`md:`, `lg:`) exclusively. Do not add separate CSS files or inline media query blocks in JavaScript.

---

## Core Layout Fix — Mobile Drawer

### What changes on mobile (`< 768px`):
- The chat area takes `100vw` full width — it is the only thing visible by default
- The groups sidebar AND channels sidebar collapse into a single unified slide-in drawer from the left
- The drawer overlays the chat area with a semi-transparent backdrop

### Drawer contents (top to bottom, single scrollable column):
1. Current group name + settings gear (if a group is selected)
2. Channel list for the active group (TEXT CHANNELS header + channel entries)
3. Divider
4. Group icons (the vertical icon strip, now shown horizontally or as a list)
5. `+` Create group button
6. 🔗 Join via invite button
7. Divider
8. DIRECT MESSAGES section header
9. All DM entries
10. Current user profile bar (avatar + name + role) pinned to bottom of drawer

### Drawer behavior:
- Slides in from the left using `transform: translateX(-100%)` → `translateX(0)`
- Transition: `200ms ease`
- Width: `280px` max, `85vw` on very small screens
- Dark backdrop behind drawer: `bg-black/60`, covers the rest of the screen
- Tapping the backdrop closes the drawer
- Pressing `Escape` closes the drawer
- Navigating to any channel or DM automatically closes the drawer
- Drawer is closed by default on every page load

### Hamburger button:
- Fixed position in the top-left of the chat header: `☰`
- Size: `44×44px` minimum touch target
- Shows only on mobile (`md:hidden`)
- Toggles the drawer open/closed
- When drawer is open, button becomes `✕` (close icon)

---

## Touch Target Sizing

Every interactive element on mobile must meet **minimum 44×44px touch target** per Apple HIG / Material Design guidelines. Apply to:

- Group icon buttons in sidebar: ensure `min-w-[44px] min-h-[44px]`
- Channel entries in sidebar: `min-h-[44px]` with proper padding
- DM entries: `min-h-[44px]`
- Message action buttons (edit, delete, emoji, GIF): use `p-2` minimum, group them so they don't overlap
- Send button in message input: `min-w-[44px] min-h-[44px]`
- Emoji picker trigger: `min-w-[44px] min-h-[44px]`
- Reaction pills: `min-h-[32px]` with `px-3` padding (smaller is acceptable for reactions)
- Avatar clickable areas: wrap in a `44×44px` click zone even if avatar is 32px visually
- Modal close buttons: `44×44px`
- All `···` context menu triggers: `44×44px`

---

## Message Input — Mobile

The message input area needs special treatment on mobile:

- Input bar is `position: fixed` at the bottom of the screen on mobile
- Add `padding-bottom: env(safe-area-inset-bottom)` to handle iPhone notch/home indicator (even though primary target is Android, this is good practice)
- When the keyboard opens on mobile, the input bar lifts with the keyboard naturally (use `position: fixed` + no `height: 100vh` on parent — use `height: 100dvh` instead which accounts for the virtual keyboard)
- The message list area scrolls independently above the fixed input
- Toolbar buttons (emoji, GIF, image attach) collapse on very small screens:
  - On screens `< 380px`: hide GIF and image buttons behind a `+` expander button
  - On screens `>= 380px`: show all toolbar buttons

---

## Chat Header — Mobile

Modify the chat header for mobile:

```
[ ☰ ] [ # channel-name / @username ]    [ 🔍 ] [ 👥 ]
```

- `☰` hamburger on the far left (44×44px)
- Channel/DM name centered or left-aligned after hamburger
- Search icon `🔍` on the right (44×44px) — stub search if not built
- Members icon `👥` on the right — toggles the member list panel
- Member list panel on mobile: slides in from the RIGHT as a drawer overlay (same backdrop pattern as left drawer), not shown inline

---

## Member List Panel — Mobile

On desktop: shown as a right-side fixed panel.
On mobile: hidden by default, slides in from the right as a full-height drawer overlay when `👥` is tapped. Same backdrop + close behavior as the left drawer.

---

## Profile Card Popover — Mobile

On desktop: floats anchored near the click point.
On mobile: renders as a **bottom sheet** instead of a floating popover:
- Slides up from the bottom of the screen
- Full width, rounded top corners (`rounded-t-2xl`)
- Height: `auto`, max `85vh`
- Drag handle indicator at top (a small gray pill)
- Backdrop behind it
- Tap backdrop or drag down to dismiss
- Same content as the desktop profile card

---

## Modals — Mobile

All modals (Create Group, Join Group, Create Channel, etc.) on mobile:
- Render as bottom sheets (same pattern as profile card above) instead of centered modals
- Full width, rounded top corners
- Scrollable content if taller than `85vh`

---

## Scroll Behavior

- Message list: `overflow-y: auto`, `-webkit-overflow-scrolling: touch` for smooth momentum scrolling on iOS/Android
- Use `scroll-smooth` behavior when jumping to latest messages
- "Scroll to bottom" floating button: appears when user has scrolled up more than 300px from the bottom
  - Position: fixed, bottom-right above the message input bar
  - Style: circular indigo button with a down-arrow icon, `44×44px`
  - Shows unread count badge if new messages arrived while scrolled up
  - Tapping it smooth-scrolls to the bottom and marks messages as read

---

## Typography — Mobile

Scale down slightly on small screens:
- Message content: `text-sm` on mobile (`text-base` on desktop) — already fine if using Tailwind defaults
- Timestamps: `text-xs` — ensure they don't wrap awkwardly
- Username labels: `text-sm font-medium` — truncate with `truncate` class if too long
- Channel names in sidebar: `truncate` to prevent overflow

---

## Image & GIF Display — Mobile

- Max image width in messages: `100%` of the message bubble width (not fixed 400px) on mobile
- GIF picker panel: full width on mobile (`w-full`) instead of fixed `480px`
- GIF grid: 2 columns on mobile instead of 3
- Emoji picker: full width on mobile, positioned above the input bar

---

## Swipe Gestures (Enhancement)

Add basic swipe gesture support:
- **Swipe right** on the chat area → opens the left drawer (same as tapping `☰`)
- **Swipe left** on the chat area → closes the left drawer if open, or opens the member list on the right
- Implement with `touchstart` / `touchmove` / `touchend` event listeners
- Threshold: 50px horizontal swipe to trigger
- Only activate if the swipe starts within 40px of the screen edge (swipe right from left edge, swipe left from right edge) to avoid conflicting with horizontal scroll in message content
- Do not use any gesture library — implement with native touch events

---

## Viewport & Meta

Ensure the root layout has the correct viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

`viewport-fit=cover` is required for proper safe area handling on notched devices.

Use `100dvh` (dynamic viewport height) instead of `100vh` everywhere in the layout shell — `dvh` accounts for the browser chrome and virtual keyboard on mobile, preventing content from being hidden behind them.

---

## PWA Groundwork (Add While Here)

Since we're touching the layout, add basic PWA support now:

Create `public/manifest.json`:
```json
{
  "name": "PepChat",
  "short_name": "PepChat",
  "description": "Private group chat",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e1f22",
  "theme_color": "#5865f2",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Add to `app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#5865f2" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Create placeholder icon files at `public/icon-192.png` and `public/icon-512.png` — use a simple indigo square with "PC" text as placeholder. The user will replace these with real icons later.

Do NOT implement a service worker yet — that is a separate task. Just the manifest and meta tags for now.

---

## Testing Targets

After implementing, verify the following work correctly at `375px` width (iPhone SE / small Android) and `412px` width (Galaxy S20 Ultra):

- [ ] Hamburger opens and closes the drawer smoothly
- [ ] All channels are reachable by scrolling in the drawer
- [ ] DM section is reachable by scrolling in the drawer
- [ ] Tapping a channel closes the drawer and loads the channel
- [ ] Tapping a DM closes the drawer and loads the DM conversation
- [ ] Message input stays above the keyboard when typing
- [ ] Send button is easily tappable
- [ ] Emoji picker opens above the input bar and is fully visible
- [ ] GIF picker opens above the input bar, full width, 2-column grid
- [ ] Profile card opens as a bottom sheet
- [ ] Scroll-to-bottom button appears when scrolled up
- [ ] Swipe right from left edge opens the drawer
- [ ] No horizontal overflow / scrollbar on any screen

---

## Instructions

Apply changes to the layout shell and sidebar components only. Do not modify message rendering, data fetching hooks, Supabase logic, or Realtime subscriptions. Use Tailwind responsive prefixes exclusively — no new CSS files. Desktop layout (`lg:`) must remain pixel-perfect unchanged. No new npm packages.
