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
    builder[method] = jest.fn((...args) => {
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
    upload: jest.fn(async () => ({ data: null, error: null })),
    remove: jest.fn(async () => ({ data: null, error: null })),
    createSignedUrl: jest.fn(async () => ({ data: { signedUrl: '' }, error: null })),
  }
}

export function createSupabaseMock() {
  return {
    from: jest.fn(() => createQueryBuilder()),
    storage: { from: jest.fn(() => createStorageBucketMock()) },
    auth: {
      signInWithPassword: jest.fn(async () => ({ data: null, error: null })),
      signUp: jest.fn(async () => ({ data: { session: null }, error: null })),
      resetPasswordForEmail: jest.fn(async () => ({ data: null, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      updateUser: jest.fn(async () => ({ data: null, error: null })),
      exchangeCodeForSession: jest.fn(async () => ({ data: null, error: null })),
      setSession: jest.fn(async () => ({ data: null, error: null })),
    },
  }
}

export function resetSupabaseMock(supabase) {
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
