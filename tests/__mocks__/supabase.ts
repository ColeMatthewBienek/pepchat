import { vi } from 'vitest'

/** Chainable query builder — returns itself for every filter/modifier method. */
function makeQueryBuilder(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {}
  const chainMethods = [
    'select', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'is', 'in',
    'not', 'or', 'filter', 'match', 'order', 'limit', 'range',
  ]
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder)
  }
  builder.single = vi.fn(() =>
    Promise.resolve({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error })
  )
  // Make the builder thenable so `await supabase.from(...).select(...)` resolves
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  builder.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject)
  builder.finally = (cb: () => void) => Promise.resolve(result).finally(cb)
  return builder
}

function makeChannelMock() {
  const ch: Record<string, unknown> = {}
  ch.on = vi.fn(() => ch)
  ch.subscribe = vi.fn(() => ch)
  ch.send = vi.fn().mockResolvedValue({ status: 'ok' })
  ch.unsubscribe = vi.fn().mockResolvedValue('ok')
  return ch
}

/**
 * Returns a fake Supabase client.
 *
 * @param data  Default data returned by query chains (can be overridden per-test
 *              by reassigning the `.then` method on `client._query`).
 */
export function makeSupabaseMock(data: unknown = null, error: unknown = null) {
  const query = makeQueryBuilder({ data, error })
  const channel = makeChannelMock()

  return {
    from: vi.fn(() => query),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    /** Expose internals for per-test assertion / reconfiguration. */
    _query: query,
    _channel: channel,
  }
}
