import { vi } from 'vitest'
import type { Mock } from 'vitest'

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

export interface QueryResult {
  data?: unknown
  error?: unknown
  count?: number | null
}

export interface QueryBuilder {
  calls: [string, ...unknown[]][]
  then: (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>
  [method: string]: unknown
}

export function createQueryBuilder(
  result: QueryResult = { data: null, error: null, count: null }
): QueryBuilder {
  const builder = { calls: [] } as unknown as QueryBuilder
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      builder.calls.push([method, ...args])
      return builder
    })
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

export interface StorageBucketMock {
  upload: Mock
  remove: Mock
  createSignedUrl: Mock
}

export function createStorageBucketMock(): StorageBucketMock {
  const upload = vi.fn()
  upload.mockResolvedValue({ data: null, error: null })
  const remove = vi.fn()
  remove.mockResolvedValue({ data: null, error: null })
  const createSignedUrl = vi.fn()
  createSignedUrl.mockResolvedValue({ data: { signedUrl: '' }, error: null })
  return { upload, remove, createSignedUrl }
}

export interface SupabaseMock {
  from: Mock
  storage: { from: Mock }
  auth: {
    signInWithPassword: Mock
    signUp: Mock
    resetPasswordForEmail: Mock
    signOut: Mock
    getSession: Mock
    updateUser: Mock
  }
}

export function createSupabaseMock(): SupabaseMock {
  const from = vi.fn()
  from.mockImplementation(() => createQueryBuilder())
  const storageFrom = vi.fn()
  storageFrom.mockImplementation(() => createStorageBucketMock())
  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
  }
  const supabase: SupabaseMock = { from, storage: { from: storageFrom }, auth }
  resetSupabaseMock(supabase)
  return supabase
}

export function resetSupabaseMock(supabase: SupabaseMock): void {
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
