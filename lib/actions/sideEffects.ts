import type { SupabaseClient } from '@supabase/supabase-js'
import { logAuditEvent } from '@/lib/audit'
import { dispatchNotification } from '@/lib/server-notifications'

// ──────────────────────────────────────────────────────────────────────────────
// Typed side-effect drafts
// ──────────────────────────────────────────────────────────────────────────────

export interface AuditEventDraft {
  action: string
  targetType: string | null
  targetId: string | null
  metadata?: Record<string, unknown>
}

export interface NotificationDraft {
  type: 'mention' | 'dm_message' | 'report_resolved' | string
  payload: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────────────────────
// Result types — every side-outcome is explicit
// ──────────────────────────────────────────────────────────────────────────────

export type SideEffectResult =
  | { ok: true }
  | { ok: false; reason: 'audit_failed'; error: unknown }
  | { ok: false; reason: 'notification_failed'; error: unknown }
  | { ok: false; reason: 'after_commit_failed'; error: unknown }

export interface SideEffectOutput<T> {
  data: T
  sideEffects: SideEffectResult
}

export interface SideEffectConfig<T = unknown> {
  audit?: AuditEventDraft
  notifications?: NotificationDraft[]
  /** Patch in post-hoc IDs after the primary write but before side-effects fire. */
  afterCommit?: (result: T) => Promise<void> | void
  /** Default 'downgrade' — failures return typed errors instead of bubbling. */
  onFailure?: 'bubble' | 'downgrade' | 'silent'
}

// ──────────────────────────────────────────────────────────────────────────────
// Core wrapper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Runs a primary mutation, then applies each declared side-effect in order.
 *
 * @param supabase  Server-side client.
 * @param actorId   Identity to attribute audit rows to.
 * @param primary   Core mutation function. Its return value passes through.
 * @param config    Declarative side-effects (audit, notifications, afterCommit).
 */
export async function withSideEffects<T>(
  supabase: SupabaseClient,
  actorId: string,
  primary: () => Promise<T>,
  config: SideEffectConfig<T> = {},
): Promise<SideEffectOutput<T>> {
  const policy = config.onFailure ?? 'downgrade'

  // 1) Run the core mutation
  const data = await primary()

  // 2) Patch drafts using live result (e.g. fill in message.id)
  if (config.afterCommit) {
    try {
      await config.afterCommit(data)
    } catch (e) {
      return failure(policy, data, { ok: false, reason: 'after_commit_failed', error: e })
    }
  }

  // 3) Audit
  if (config.audit) {
    try {
      await logAuditEvent(
        supabase,
        actorId,
        config.audit.action,
        config.audit.targetType,
        config.audit.targetId,
        config.audit.metadata,
      )
    } catch (e) {
      return failure(policy, data, { ok: false, reason: 'audit_failed', error: e })
    }
  }

  // 4) Notification fanout
  if (config.notifications?.length) {
    for (const draft of config.notifications) {
      try {
        await dispatchNotification(supabase, draft)
      } catch (e) {
        return failure(policy, data, { ok: false, reason: 'notification_failed', error: e })
      }
    }
  }

  return { data, sideEffects: { ok: true } }
}

// ──────────────────────────────────────────────────────────────────────────────
// Policy helpers
// ──────────────────────────────────────────────────────────────────────────────

function failure<T>(
  policy: 'bubble' | 'downgrade' | 'silent',
  data: T,
  result: SideEffectResult,
): SideEffectOutput<T> {
  if (policy === 'bubble') {
    const reason = (result as Exclude<SideEffectResult, { ok: true }>).reason
    throw new Error(`Side effect failed (${reason})`)
  }
  if (policy === 'silent') {
    console.warn('[SideEffect][silent]', result)
  }
  return { data, sideEffects: result }
}
