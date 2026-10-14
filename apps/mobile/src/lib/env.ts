import { z } from 'zod';

// EXPO_PUBLIC_* değişkenleri Metro tarafından statik olarak inline edilir; bu yüzden
// process.env.EXPO_PUBLIC_X şeklinde DOĞRUDAN erişilmeli (dinamik indexleme inline olmaz).
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_MAPS_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
});

if (!parsed.success) {
  throw new Error(
    'Ortam değişkenleri eksik/geçersiz. .env.example dosyasını .env olarak kopyalayıp doldurun.\n' +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
}

export const env = parsed.data;
