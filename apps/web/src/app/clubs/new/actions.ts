'use server';

import { DEFAULT_CAPACITY_TIERS, billingPeriodSchema, clubCreateSchema } from '@motogroup/shared';
import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createPaytrToken } from '@/lib/paytr';

// Sınırsız (Chapter) paket için kapasite sentinel'i.
const UNLIMITED_CAPACITY = 1_000_000;

const createClubInputSchema = clubCreateSchema.extend({
  tier_id: z.string(),
  period: billingPeriodSchema,
});

export type CheckoutResult = { error: string } | { token: string };

/**
 * Ödeme başlatma (CLAUDE.md Bölüm 8 adım 9). MOCK DEĞİL — gerçek PayTR.
 *
 * 1) Kulüp 'pending' + bekleyen abonelik sunucuda oluşturulur (create_pending_club RPC).
 * 2) PayTR iframe token'ı üretilir; client iframe'i gösterir.
 * 3) Kapasite/abonelik aktivasyonu YALNIZCA webhook ile olur (paytr-webhook Edge Function);
 *    client'a ve tarayıcı redirect'ine güvenilmez (Bölüm 4 & 7).
 *
 * Tutar/kapasite sunucudaki tier tanımından gelir — client'tan fiyat alınmaz.
 */
export async function startCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = createClubInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Form geçersiz' };
  }
  const { tier_id, period, ...clubFields } = parsed.data;

  const tier = DEFAULT_CAPACITY_TIERS.find((t) => t.id === tier_id);
  if (!tier) return { error: 'Geçersiz paket' };

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.email) return { error: 'Oturum bulunamadı, tekrar giriş yapın' };

  const capacity = tier.memberLimit ?? UNLIMITED_CAPACITY;
  const amount = period === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
  const merchantOid = ('MK' + randomUUID().replace(/-/g, '')).slice(0, 64);

  // 1) Pending kulüp + abonelik (service_role, atomik RPC).
  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc('create_pending_club', {
    p_owner: user.id,
    p_name: clubFields.name,
    p_description: clubFields.description ?? undefined,
    p_city: clubFields.city ?? undefined,
    p_moto_type: clubFields.moto_type ?? undefined,
    p_logo_url: clubFields.logo_url ?? undefined,
    p_tier: tier.id,
    p_capacity: capacity,
    p_amount: amount,
    p_period: period,
    p_merchant_oid: merchantOid,
  });
  if (rpcError) return { error: rpcError.message };

  // 2) PayTR token.
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const userIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

  try {
    const token = await createPaytrToken({
      merchantOid,
      amount,
      email: user.email,
      userIp,
      userName: clubFields.name,
      productLabel: `${tier.label} (${period === 'yearly' ? 'Yıllık' : 'Aylık'})`,
      okUrl: `${origin}/dashboard?paid=1`,
      failUrl: `${origin}/dashboard?failed=1`,
      testMode: process.env.NODE_ENV !== 'production',
    });
    return { token };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Ödeme başlatılamadı' };
  }
}
