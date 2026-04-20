import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  resolve: {
    alias: [
      // Specific aliases first — Vite matches in order (first wins).
      // Intercepts the dynamic require('dompurify') in lib/markdown.ts
      { find: 'dompurify', replacement: path.resolve(__dirname, 'tests/__mocks__/dompurify.ts') },
      // Global supabase client mock — component render tests get empty-data client by default.
      // Tests needing specific behaviour still override with vi.mock('@/lib/supabase/client', ...).
      { find: '@/lib/supabase/client', replacement: path.resolve(__dirname, 'tests/__mocks__/supabaseClient.ts') },
      // General @ alias last so the specific ones above take precedence.
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
})
