import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export function inviteLookupClient(userScopedSupabase: SupabaseClient) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : userScopedSupabase
}
