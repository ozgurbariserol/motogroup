import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server tarafı client — kullanıcının cookie oturumuyla çalışır (RLS bu oturuma uyar).
// ANON key kullanır; service_role DEĞİL.
//
// NOT: Database generic'i BİLİNÇLİ olarak verilmiyor. @supabase/ssr'ın tipli server
// client'ı dar select/update'lerde `never` üretiyor (bilinen friction). Web tarafı
// tüm sorgu sonuçlarını zaten Zod ile doğruladığından tipsiz client güvenli ve daha
// temiz. (Browser ve admin client'ları tipli kalır.)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component'ten çağrıldığında set başarısız olabilir; middleware
            // oturumu zaten yeniler. Yutulması güvenli.
          }
        },
      },
    },
  );
}
