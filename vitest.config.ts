import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Intercepts the dynamic require('dompurify') in lib/markdown.ts
      'dompurify': path.resolve(__dirname, 'tests/__mocks__/dompurify.ts'),
    },
  },
})
