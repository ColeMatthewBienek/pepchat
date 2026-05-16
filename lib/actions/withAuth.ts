import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type AuthenticatedActionContext = {
  supabase: SupabaseClient
  user: User
}

export function withAuth<Args extends unknown[], Result>(
  body: (ctx: AuthenticatedActionContext, ...args: Args) => Promise<Result>,
  options: {
    unauthenticated: () => Result | never
  }
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return options.unauthenticated()

    return body({ supabase, user }, ...args)
  }
}
