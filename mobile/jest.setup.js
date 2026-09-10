jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

globalThis.IS_REACT_ACT_ENVIRONMENT = true

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL = 'https://palaysigla.test/auth/callback'
process.env.EXPO_PUBLIC_API_URL = 'https://api.palaysigla.test'
