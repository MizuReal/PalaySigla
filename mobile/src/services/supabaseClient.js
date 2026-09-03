// Singleton Supabase client (auth + storage + Postgres) used by every
// feature service. The landing screen does not import it yet — auth and the
// data services arrive with their phases. Sessions persist through
// AsyncStorage, never in memory only (AGENTS.md React Native rule).
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

function requireConfiguredEnv(value, envKey) {
  if (!value) {
    throw new Error(
      `Missing ${envKey}. Copy mobile/.env.example to mobile/.env and fill in the values.`
    )
  }
  return value
}

export const supabase = createClient(
  requireConfiguredEnv(SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  requireConfiguredEnv(SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
