'use client';

import type { Database } from '@motogroup/shared';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

// Tarayıcı tarafı client — yalnızca ANON key. Auth (giriş) için kullanılır.
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
