import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@motogroup/shared';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { env } from './env';

// Mobil yalnızca ANON key kullanır. service_role ASLA client'ta olmaz (Bölüm 7).
// Oturum AsyncStorage'da kalıcı; RLS bu oturumdaki auth.uid()'e dayanır.
export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
