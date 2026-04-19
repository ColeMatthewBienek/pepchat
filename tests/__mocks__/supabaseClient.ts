import { vi } from 'vitest'
import { makeSupabaseMock } from './supabase'

// Default mock returns empty arrays — safe for all component render tests.
// Tests needing specific data should override with vi.mock('@/lib/supabase/client', ...).
const client = makeSupabaseMock([], null)

export const createClient = vi.fn(() => client)
