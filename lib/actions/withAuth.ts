import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ──────────────────────────────────────────────────────────────────────────────
// Context contract
// ──────────────────────────────────────────────────────────────────────────────

type ResolvedSupabase = Awaited<ReturnType<typeof createClient>>

export interface UnauthenticatedActionContext {
  /**
   * Create a fresh Supabase client for the current request.
   * Useful for reading user preferences without requiring auth.
   */
  supabase: ResolvedSupabase
}

export interface AuthenticatedActionContext {
  supabase: ResolvedSupabase
  user: { id: string }
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler signatures
// ──────────────────────────────────────────────────────────────────────────────

type AuthActionHandler<Params extends unknown[], Result> = (
  ctx: AuthenticatedActionContext,
  ...args: Params
) => Promise<Result>

// ──────────────────────────────────────────────────────────────────────────────
// Higher-order factory
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Higher-order factory that injects Supabase auth into any server action.
 *
 * - Resolves a verified session via `createClient()` → `getUser()`.
 * - Guarantees a live user before calling `body`.
 * - On unauthenticated access, either throws (default) or delegates to
 *   `opts.unauthenticated` and forwards its value through to the caller.
 *
 * Uses `NoInfer` so that `Result` is always inferred from the `body` function,
 * not from the `unauthenticated` branch.
 */
export function withAuth<Params extends unknown[], Result>(
  body: AuthActionHandler<Params, Result>,
  opts?: {
    unauthenticated?: (ctx: UnauthenticatedActionContext) => NoInfer<Result>
  },
): (...args: Params) => Promise<Result> {
  return async (...args: Params): Promise<Result> => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (opts?.unauthenticated) return opts.unauthenticated({ supabase })
      redirect('/login')
    }

    return body({ supabase, user }, ...args)
  }
}
