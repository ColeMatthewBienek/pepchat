# Notification Navigation Fallback

## Problem

Notification event URLs already deep-link to message anchors:

- Channel mentions: `/channels/{channelId}#{messageId}`
- Direct messages: `/dm/{conversationId}#{messageId}`

When the linked message is deleted, outside the currently loaded message window, hidden by existing client filters, or otherwise unavailable to the current user, the app still opens the channel/DM but the hash jump silently does nothing. Users get no indication that the notification target could not be shown.

Keep the existing valid deep-link behavior. Add a small client-side fallback that explains the missing target without changing stored notification URLs or service-worker click semantics.

## Non-goals

- Do not add new database columns or migrations.
- Do not change notification event creation URLs in `lib/server-notifications.ts`.
- Do not change service-worker `notificationclick` URL opening behavior in `public/sw.js`.
- Do not implement historical message pagination/search to fetch an old target message.
- Do not add server-side validation of every notification target.
- Do not alter delete semantics for messages or DMs.
- Do not reuse the shared `notice` state or success-green notice UI for this fallback.

## User Experience

- Clicking a notification with a valid URL still opens the exact channel or DM URL and highlights/scrolls to the linked message when it is present in the loaded list.
- Clicking a notification whose hash message is not present after the route's initial messages are ready still lands in the owning channel or DM conversation.
- The message pane shows a small auto-clearing warning/error notice: `That message is no longer available.`
- The fallback notice uses non-success styling, matching existing danger/error message patterns (`text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20`) or an equivalent warning/error variant if the Builder extracts a small component.
- The fallback notice clears automatically after 4 seconds or immediately after a later successful hash jump.
- The fallback notice should not block reading the current channel/DM.
- The fallback notice should not appear for pages without a hash, empty hashes, successful jumps, initial unread auto-scroll, or search-result navigation.
- Existing mute/edit/report/delete/mark-unread confirmation notices continue to behave independently and must not clear or overwrite the fallback notice.

## Technical Approach

1. Keep notification URL behavior stable.
   - Leave notification event URLs as-is.
   - Leave `NotificationTray` link `href={event.url ?? '/channels'}` behavior intact except for tests that assert valid URLs are preserved.
   - Leave service worker opening/focusing the notification payload URL unchanged.

2. Reuse the existing hash ownership flow.
   - `ChannelShell` reads `window.location.hash` and passes `highlightedMessageId` to `MessageList`.
   - `DMConversationView` does the same for DMs.
   - `MessageList` owns the DOM query and scroll/highlight behavior.
   - Keep `handleJump` / `highlightedMessageId` reset behavior scoped to hash and pinned-message jumps; do not route unread or local search navigation through fallback handling.

3. Add a dedicated fallback state path in `MessageList`.
   - Add a dedicated state key such as `notificationFallbackNotice` or `missingHashTargetNotice`.
   - Do not use or repurpose the existing `notice` state. It is shared by local confirmations such as mute, reply-to-missing-original, mark unread, and report submitted.
   - Make local `jumpToMessage(messageId: string)` return `true` when it finds and scrolls/highlights a `[data-message-id="..."]` element, and `false` when `listRef` is unavailable or no matching element exists.
   - In the `highlightedMessageId` effect only, set the dedicated fallback notice to `That message is no longer available.` when the bounded fallback check determines the target is absent.
   - On successful `highlightedMessageId` jumps, clear the dedicated fallback notice.
   - Clear only the dedicated fallback notice after 4 seconds. Cancel that timer when the component unmounts or a later hash jump result replaces the notice.
   - Existing calls to `setNotice(...)` for mute/report/mark-unread/reply-copy must not clear `notificationFallbackNotice` unless a later successful hash jump occurs.

4. Render the fallback notice with non-success styling.
   - Do not render `notificationFallbackNotice` through the existing success-green `notice` block.
   - Preferred minimal implementation: add a separate block next to the existing `error` / `notice` blocks:
     - `data-testid="notification-fallback-notice"`
     - `role="status"` or `aria-live="polite"`
     - danger/error classes matching existing inline errors: `text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-3 py-1.5 mx-4 mb-2`
   - If the Builder extracts a small message-banner component instead, it must support a non-success variant and the fallback dispatch must explicitly use that variant.

5. Avoid DM cold-load false positives.
   - A single `requestAnimationFrame` / `setTimeout(..., 0)` defer is not sufficient for DM cold loads because `DMConversationView` sets `highlightedMessageId` before `useDMMessages(conversationId)` has finished fetching initial messages, and the parent clears the highlight after roughly 1.7 seconds.
   - Add explicit initial-load readiness to the DM message path. Preferred implementation:
     - Extend `useDMMessages` to expose `initialLoading` or `initialMessagesLoaded` for its first `fetchInitial()` request.
     - In `DMConversationView`, pass a new `messagesReadyForHashFallback` prop to `MessageList` only after the DM initial message request has completed.
     - While participants or initial DM messages are loading, do not evaluate missing-hash fallback. Also avoid rendering `DMEmptyState` until the initial DM message request has completed so an empty array from the pre-fetch state is not treated as a real empty conversation.
   - For channel pages, `initialMessages` are already supplied to `ChannelShell`; pass `messagesReadyForHashFallback={true}` after the first render/list mount is available.
   - In `MessageList`, the `highlightedMessageId` fallback effect must wait for both `messagesReadyForHashFallback` and `listRef.current` before deciding the target is absent.
   - If the Builder chooses polling instead of an explicit loading flag, keep it bounded: retry the DOM lookup on a short interval until either the target appears, `messagesReadyForHashFallback` becomes true, or a max timeout/retry count is reached. Do not add network fetches or unbounded loops.

6. Keep unread/search behavior separate.
   - Initial unread auto-scroll calls to `jumpToMessage(unreadMessageId)` must ignore the boolean return value and must not set `notificationFallbackNotice`.
   - Search-result jumps must ignore the boolean return value and must not set `notificationFallbackNotice`.
   - Reply-to-original missing handling should continue to use its existing local copy (`Original message is not loaded. Load earlier messages and try again.`) and shared confirmation notice path unless the Builder chooses to separately refactor notices outside this spec's scope.

## Data / Security Notes

- No schema changes.
- No new Supabase queries beyond the existing DM initial message request already performed by `useDMMessages`.
- No expanded message visibility. The fallback only reacts to messages already available to the client under existing RLS and route access checks.
- The notice must not reveal whether a message exists in another channel/DM, was deleted by a moderator, is outside the loaded window, or is hidden by local filters. Use generic copy: `That message is no longer available.`
- The fallback state is client-only UI state and should not be persisted.

## Change Manifest

- `components/chat/MessageList.tsx` — add dedicated `notificationFallbackNotice` state, make hash-triggered `jumpToMessage` handling return success/failure, render the fallback with non-success styling, and ensure unread/search/local confirmation notices cannot trigger or clobber it.
- `components/chat/ChannelShell.tsx` — continue passing channel hash IDs to `MessageList`; pass hash-fallback readiness once the channel list has mounted/initial messages are available.
- `components/dm/DMConversationView.tsx` — gate hash fallback until participants and initial DM messages are loaded; avoid treating pre-fetch empty DM messages as a real empty conversation; pass `messageLinkBasePath="/dm"` unchanged.
- `lib/hooks/useDMs.ts` — expose initial DM message load readiness (`initialLoading` or `initialMessagesLoaded`) from `useDMMessages` without changing query scope.
- `tests/components/MessageList.test.tsx` — add component coverage for successful hash jumps not showing the fallback, missing hash targets showing the fallback notice with non-success styling, fallback clearing after 4 seconds with fake timers, and unread/search jumps not showing the fallback.
- `tests/components/ChannelShell.test.tsx` — keep/extend channel hash coverage to verify valid hash IDs are still passed through to `MessageList` with hash-fallback readiness.
- `tests/components/DMConversationView.test.tsx` — add cold-load deep-link coverage proving no fallback appears before initial DM messages finish loading and valid loaded DM hash targets do not show the fallback.
- `tests/components/NotificationTray.test.tsx` — assert notification links retain their stored `event.url` values, including message hash URLs.

## Success Criteria

- Valid channel notification URL `/channels/ch-1#msg-1` still opens the channel and highlights `msg-1` when the message is in `MessageList`.
- Valid DM notification URL `/dm/conv-1#dm-1` still opens the DM and highlights `dm-1` when the message is present after the initial DM message load.
- Missing/unavailable hash target shows `That message is no longer available.` in the message pane only after the relevant route's initial messages are ready.
- The fallback notice is rendered from dedicated fallback state, not from the shared `notice` state.
- The fallback notice uses danger/error or equivalent warning styling, not success-green styling.
- Existing mute/report/mark-unread/reply confirmation notices cannot overwrite or clear the fallback notice, and the fallback notice cannot overwrite those confirmations.
- Missing/unavailable hash target notice clears after 4 seconds using cancellable timers or immediately after a later successful hash jump.
- DM cold-load deep links do not false-positive the fallback while `useDMMessages` is still fetching initial messages.
- Initial unread auto-scroll and search-result navigation do not show the fallback notice when their target is absent.
- Missing/unavailable hash target does not redirect away from the channel/DM fallback route.
- No notification URL generation changes are made in `lib/server-notifications.ts`.
- No service-worker click behavior changes are made in `public/sw.js`.
- Tests cover valid URL preservation, missing-target fallback, DM cold-load timing, fake-timer notice clearing, and no-notice unread/search paths.

## Test Plan

- Run targeted component tests:
  - `npm test -- tests/components/MessageList.test.tsx`
  - `npm test -- tests/components/ChannelShell.test.tsx`
  - `npm test -- tests/components/DMConversationView.test.tsx`
  - `npm test -- tests/components/NotificationTray.test.tsx`
- Use fake timers in the fallback tests for:
  - `highlightedMessageId` reset timing where relevant.
  - The 4-second fallback auto-clear.
  - DM cold-load timing so the test can assert no notice before initial messages resolve and no notice for a valid target after they resolve.
- MessageList test cases to add or update:
  - present `highlightedMessageId` scrolls/highlights and does not render `notification-fallback-notice`.
  - missing `highlightedMessageId` renders `notification-fallback-notice` with non-success styling after readiness.
  - fallback notice clears after 4 seconds.
  - unread auto-scroll target absence does not render `notification-fallback-notice`.
  - search navigation target absence does not render `notification-fallback-notice`.
  - local confirmation notice and fallback notice use independent state.
- DMConversationView test cases to add or update:
  - `/dm/conv-1#dm-1` cold-load path does not render fallback before `useDMMessages` initial load completes.
  - after initial DM messages load with `dm-1` present, `MessageList` receives `highlightedMessageId="dm-1"` and no fallback is shown.
  - after initial DM messages load without the hash target, fallback readiness permits the missing-target notice.
- If targeted tests pass, run the broader relevant suite if time allows:
  - `npm test -- tests/components`

## Open Questions

- None
