/**
 * DOMPurify alias mock for Vitest.
 * Strips <script> blocks and inline event handlers so XSS tests are meaningful
 * without needing a full browser DOM. Matches the PURIFY_CONFIG in lib/markdown.ts.
 */
const DOMPurify = {
  sanitize(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\s+on\w+="[^"]*"/gi, '')
      .replace(/<img[^>]*>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
  },
}

export default DOMPurify
