# Claude Code Prompt — Markdown Rendering in Messages

Pipe message content through a lightweight markdown renderer. Support bold, italics, inline code, code blocks, strikethrough, and blockquotes. Messages should feel rich and expressive without becoming a full document editor.

---

## Library

Install `marked` — it is lightweight, fast, has no dependencies, and works on the Cloudflare edge runtime:

```bash
npm install marked
npm install -D @types/marked
```

Do NOT use `remark`, `react-markdown`, or `rehype` — these have heavy dependency trees and may cause issues with Cloudflare Pages edge runtime.

---

## Supported Markdown Syntax

Support exactly these features — no more:

| Syntax | Output |
|--------|--------|
| `**bold**` or `__bold__` | **bold** |
| `*italic*` or `_italic_` | *italic* |
| `` `inline code` `` | `inline code` |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `> blockquote` | indented quote block |
| ` ```code block``` ` | syntax-highlighted code block |
| `[text](url)` | clickable link |

Explicitly disable everything else to keep messages clean and safe:
- No headings (`#`, `##`, etc.) — too large for chat context
- No horizontal rules (`---`)
- No images via markdown (`![alt](url)`) — images use the existing upload system
- No HTML passthrough — sanitize all HTML to prevent XSS
- No tables
- No task lists

---

## lib/markdown.ts

Create a centralized markdown processing utility:

```ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked with safe, chat-appropriate settings
const renderer = new marked.Renderer()

// Open links in new tab, add security attributes
renderer.link = (href, title, text) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">${text}</a>`
}

// Style code blocks
renderer.code = (code, language) => {
  return `
    <div class="relative my-1 rounded-md overflow-hidden">
      ${language ? `<div class="bg-zinc-900 px-3 py-1 text-xs text-zinc-400 font-mono border-b border-zinc-700">${language}</div>` : ''}
      <pre class="bg-zinc-900 p-3 overflow-x-auto"><code class="text-sm font-mono text-zinc-200">${escapeHtml(code)}</code></pre>
    </div>
  `
}

// Style inline code
renderer.codespan = (code) => {
  return `<code class="bg-zinc-800 text-pink-300 px-1 py-0.5 rounded text-sm font-mono">${code}</code>`
}

// Style blockquotes
renderer.blockquote = (quote) => {
  return `<blockquote class="border-l-4 border-zinc-500 pl-3 my-1 text-zinc-400 italic">${quote}</blockquote>`
}

marked.setOptions({
  renderer,
  gfm: true,           // GitHub Flavored Markdown (enables strikethrough)
  breaks: true,        // newlines become <br> — important for chat
  pedantic: false,
  mangle: false,
  headerIds: false,
})

// DOMPurify config — allow only safe tags
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'a', 'del', 'blockquote', 'br', 'span', 'div', 'p'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  FORBID_TAGS: ['img', 'script', 'style', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
}

export function renderMarkdown(content: string): string {
  const raw = marked.parse(content) as string
  return DOMPurify.sanitize(raw, PURIFY_CONFIG)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

Install DOMPurify for sanitization:
```bash
npm install dompurify
npm install -D @types/dompurify
```

DOMPurify only runs in the browser — it is not available server-side. Since messages render in client components, this is fine. Add a guard:
```ts
// Only sanitize in browser context
if (typeof window === 'undefined') return marked.parse(content) as string
```

---

## components/chat/MessageContent.tsx

Create a dedicated component for rendering message content:

```tsx
'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/markdown'

interface MessageContentProps {
  content: string
  isEditing?: boolean
}

export function MessageContent({ content, isEditing }: MessageContentProps) {
  const html = useMemo(() => renderMarkdown(content), [content])

  if (isEditing) {
    // In edit mode, show raw markdown text — not rendered
    return null // handled by the edit input component
  }

  return (
    <div
      className="message-content text-zinc-100 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

**Important:** Using `dangerouslySetInnerHTML` is safe here ONLY because DOMPurify sanitizes the output before it reaches this component. The chain is: raw user text → marked (parse) → DOMPurify (sanitize) → dangerouslySetInnerHTML. Never skip the sanitization step.

---

## CSS — Message Content Styles

Add these styles to `globals.css` (scoped to `.message-content` to avoid leaking into other UI):

```css
.message-content p {
  margin: 0;
  line-height: 1.5;
}

.message-content p + p {
  margin-top: 4px;
}

.message-content strong {
  font-weight: 600;
  color: #f2f3f5;
}

.message-content em {
  font-style: italic;
  color: #d4d7dc;
}

.message-content del {
  text-decoration: line-through;
  color: #72767d;
}

.message-content pre {
  margin: 4px 0;
  border-radius: 6px;
  overflow-x: auto;
}

.message-content code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.message-content blockquote {
  margin: 4px 0;
}

.message-content a:hover {
  text-decoration: underline;
}

/* Prevent markdown from breaking layout in compact messages */
.message-content > *:last-child {
  margin-bottom: 0;
}
```

---

## Cloudflare Pages Compatibility

- `marked` is a pure JS library with no Node.js dependencies — fully edge-compatible
- `dompurify` requires `window` — guard with `typeof window !== 'undefined'`
- Do not use `rehype-sanitize` or any unified/remark plugins — they are not edge-compatible
- `useMemo` ensures markdown is only parsed when content changes — no performance impact on re-renders

---

## Edit Mode Behavior

When a user edits their message:
- The edit input shows the **raw markdown text** (e.g. `**bold**`), not the rendered HTML
- On save, the raw markdown is stored in the database (this is already how it works — no change needed)
- On cancel, the rendered view returns immediately

This is the same behavior as Discord, Slack, and every major chat app — users write markdown, see rendered output.

---

## Message Input — Markdown Hints

Add a subtle formatting toolbar hint below the message input (desktop only, hidden on mobile):

```
** bold **   * italic *   `code`   ``` code block ```   > quote
```

Shown as small muted text below the input box. These are not buttons — just visual hints. Clicking them does nothing. Hide with `hidden md:flex`.

---

## Security Notes for Code Review

- All user content passes through DOMPurify before rendering
- `ALLOWED_TAGS` whitelist is strict — only formatting tags, no structural or interactive HTML
- Links get `rel="noopener noreferrer"` to prevent tab-napping
- Code block content is HTML-escaped before being placed inside `<code>` tags
- No `eval`, no dynamic script execution, no `innerHTML` without sanitization

---

## Instructions

Apply to the `Message` component by replacing the current plain text content render with `<MessageContent content={message.content} />`. Apply to DM messages as well — use the same component. Do not apply markdown rendering to: channel names, usernames, group names, bio text in profiles, or any system UI text — only to user-authored message content. Update `schema.sql` only if needed (no schema changes required for this feature).
