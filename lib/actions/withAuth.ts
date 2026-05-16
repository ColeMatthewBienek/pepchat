import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type AuthenticatedActionContext = {
  supabase: SupabaseClient
  user: User
}

/**
 * Higher-order function that wraps a server action body with authentication.
 *
 * The caller receives { supabase, user } when authenticated.
 * When unauthenticated, the caller-provided handler runs instead — preserving
 * per-action return shapes ({ error }, { redirectTo }, redirect('/login'), etc.).
 *
 * Must live outside a 'use server' file so the non-async HOF export does not
 * violate Next.js server-action file constraints.
 */
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
