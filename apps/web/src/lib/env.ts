import { z } from 'zod';

// Public env — client + server her yerde okunabilir.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// NEXT_PUBLIC_* statik inline edilir → doğrudan erişim şart.
const publicParsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!publicParsed.success) {
  throw new Error(
    'Public ortam değişkenleri eksik. .env.example → .env kopyalayıp doldurun.\n' +
      JSON.stringify(publicParsed.error.flatten().fieldErrors, null, 2),
  );
}

export const publicEnv = publicParsed.data;

/**
 * Server-only secret'lar. SADECE server tarafında (Server Component / Route Handler /
 * Server Action) çağrılmalı. Client bundle'a sızmaması için bu fonksiyon import edildiği
 * dosya 'use client' OLMAMALI.
 */
export function getServerEnv() {
  const serverEnvSchema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  });
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil (server-only).');
  }
  return parsed.data;
}

/**
 * PayTR secret'ları — SADECE server tarafı (checkout token üretimi / webhook).
 * Client'a ASLA sızmamalı (NEXT_PUBLIC_ değil).
 */
export function getPaytrEnv() {
  const schema = z.object({
    PAYTR_MERCHANT_ID: z.string().min(1),
    PAYTR_MERCHANT_KEY: z.string().min(1),
    PAYTR_MERCHANT_SALT: z.string().min(1),
  });
  const parsed = schema.safeParse({
    PAYTR_MERCHANT_ID: process.env.PAYTR_MERCHANT_ID,
    PAYTR_MERCHANT_KEY: process.env.PAYTR_MERCHANT_KEY,
    PAYTR_MERCHANT_SALT: process.env.PAYTR_MERCHANT_SALT,
  });
  if (!parsed.success) {
    throw new Error('PayTR ortam değişkenleri eksik (PAYTR_MERCHANT_ID/KEY/SALT).');
  }
  return parsed.data;
}
