import { marked, type Tokens } from 'marked'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, text }: Tokens.Link) {
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">${text}</a>`
    },

    code({ text, lang }: Tokens.Code) {
      return `<div class="relative my-1 rounded-md overflow-hidden">${
        lang ? `<div class="bg-zinc-900 px-3 py-1 text-xs text-zinc-400 font-mono border-b border-zinc-700">${escapeHtml(lang)}</div>` : ''
      }<pre class="bg-zinc-900 p-3 overflow-x-auto"><code class="text-sm font-mono text-zinc-200">${escapeHtml(text)}</code></pre></div>`
    },

    codespan({ text }: Tokens.Codespan) {
      return `<code class="bg-zinc-800 text-pink-300 px-1 py-0.5 rounded text-sm font-mono">${text}</code>`
    },

    // Disable headings — render as plain paragraphs
    heading({ text }: Tokens.Heading) {
      return `<p>${text}</p>`
    },

    // Disable horizontal rules
    hr() {
      return ''
    },

    // Disable images — use the existing upload system
    image() {
      return ''
    },
  },
})

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'a', 'del', 'blockquote', 'br', 'span', 'div', 'p'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  FORBID_TAGS: ['img', 'script', 'style', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
}

export function renderMarkdown(content: string): string {
  const raw = marked.parse(content) as string
  if (typeof window === 'undefined') return raw
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require('dompurify')
  return DOMPurify.sanitize(raw, PURIFY_CONFIG)
}
