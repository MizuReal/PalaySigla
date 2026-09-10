import { vi } from 'vitest'

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'is',
  'not',
  'or',
  'in',
  'order',
  'range',
  'limit',
  'match',
  'ilike',
  'filter',
  'textSearch',
  'single',
  'maybeSingle',
]

export function createQueryBuilder(result = { data: null, error: null, count: null }) {
  const builder = { calls: [], result }
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args) => {
      builder.calls.push([method, ...args])
      return builder
    })
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

export function createStorageBucketMock() {
  return {
    upload: vi.fn(async () => ({ data: null, error: null })),
    remove: vi.fn(async () => ({ data: null, error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: '' }, error: null })),
  }
}

export function createSupabaseMock() {
  return {
    from: vi.fn(() => createQueryBuilder()),
    storage: { from: vi.fn(() => createStorageBucketMock()) },
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: null, error: null })),
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: null, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      updateUser: vi.fn(async () => ({ data: null, error: null })),
    },
  }
}

export function resetSupabaseMock(supabase) {
  vi.resetAllMocks()
  supabase.from.mockImplementation(() => createQueryBuilder())
  supabase.storage.from.mockImplementation(() => createStorageBucketMock())
  supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: null })
  supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: null })
  supabase.auth.signOut.mockResolvedValue({ error: null })
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  supabase.auth.updateUser.mockResolvedValue({ data: null, error: null })
}
