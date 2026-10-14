import 'server-only';

import type { Database } from '@motogroup/shared';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv, publicEnv } from '@/lib/env';

/**
 * service_role client — RLS'i BYPASS eder. Yalnızca güvenilen sunucu mantığında
 * (ödeme onayı sonrası kulüp provizyonu, ileride PayTR webhook) kullanılır.
 *
 * 'server-only' import'u bu modülün yanlışlıkla client bundle'a girmesini derleme
 * zamanında engeller (CLAUDE.md Bölüm 7: service_role ASLA client'ta olmaz).
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
