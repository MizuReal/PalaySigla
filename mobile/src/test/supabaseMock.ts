/// <reference types="jest" />

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
    builder[method] = jest.fn((...args: unknown[]) => {
      builder.calls.push([method, ...args])
      return builder
    })
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

export interface StorageBucketMock {
  upload: jest.Mock
  remove: jest.Mock
  createSignedUrl: jest.Mock
}

export function createStorageBucketMock(): StorageBucketMock {
  const upload = jest.fn()
  upload.mockResolvedValue({ data: null, error: null })
  const remove = jest.fn()
  remove.mockResolvedValue({ data: null, error: null })
  const createSignedUrl = jest.fn()
  createSignedUrl.mockResolvedValue({ data: { signedUrl: '' }, error: null })
  return { upload, remove, createSignedUrl }
}

export interface SupabaseMock {
  from: jest.Mock
  storage: { from: jest.Mock }
  auth: {
    signInWithPassword: jest.Mock
    signUp: jest.Mock
    resetPasswordForEmail: jest.Mock
    signOut: jest.Mock
    getSession: jest.Mock
    updateUser: jest.Mock
    exchangeCodeForSession: jest.Mock
    setSession: jest.Mock
  }
}

export function createSupabaseMock(): SupabaseMock {
  const from = jest.fn()
  from.mockImplementation(() => createQueryBuilder())
  const storageFrom = jest.fn()
  storageFrom.mockImplementation(() => createStorageBucketMock())
  const auth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    updateUser: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    setSession: jest.fn(),
  }
  const supabase: SupabaseMock = { from, storage: { from: storageFrom }, auth }
  resetSupabaseMock(supabase)
  return supabase
}

export function resetSupabaseMock(supabase: SupabaseMock): void {
  const supabaseMocks = [
    supabase.from,
    supabase.storage.from,
    ...Object.values(supabase.auth),
  ]
  for (const mock of supabaseMocks) {
    mock.mockReset()
  }
  supabase.from.mockImplementation(() => createQueryBuilder())
  supabase.storage.from.mockImplementation(() => createStorageBucketMock())
  supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: null })
  supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: null })
  supabase.auth.signOut.mockResolvedValue({ error: null })
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  supabase.auth.updateUser.mockResolvedValue({ data: null, error: null })
  supabase.auth.exchangeCodeForSession.mockResolvedValue({ data: null, error: null })
  supabase.auth.setSession.mockResolvedValue({ data: null, error: null })
}
