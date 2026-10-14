'use server';

import {
  DEFAULT_CAPACITY_TIERS,
  billingPeriodSchema,
  clubSchema,
  clubUpdateSchema,
  computeUpgradeAmount,
  tierCapacity,
} from '@motogroup/shared';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPaytrToken } from '@/lib/paytr';
import { createClient } from '@/lib/supabase/server';

// Üye yönetimi server action'ları. Yetki RLS ile zorlanır (is_club_admin):
// owner/admin değilse update/delete 0 satır etkiler. Kapasite gating onayda
// sunucu trigger'ı ile devreye girer.

const inputSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
});

const roleInputSchema = inputSchema.extend({ role: z.enum(['admin', 'member']) });

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function approveMember(raw: z.infer<typeof inputSchema>): Promise<ActionResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'active' })
    .eq('club_id', parsed.data.clubId)
    .eq('profile_id', parsed.data.profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clubs/${parsed.data.clubId}`);
  return { ok: true };
}

export async function removeMember(raw: z.infer<typeof inputSchema>): Promise<ActionResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_members')
    .delete()
    .eq('club_id', parsed.data.clubId)
    .eq('profile_id', parsed.data.profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clubs/${parsed.data.clubId}`);
  return { ok: true };
}

export async function setMemberRole(raw: z.infer<typeof roleInputSchema>): Promise<ActionResult> {
  const parsed = roleInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_members')
    .update({ role: parsed.data.role })
    .eq('club_id', parsed.data.clubId)
    .eq('profile_id', parsed.data.profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clubs/${parsed.data.clubId}`);
  return { ok: true };
}

// === Kulüp profili ===
const profileInputSchema = z.object({
  clubId: z.string().uuid(),
  data: clubUpdateSchema,
});

/** Kulüp profilini güncelle (ad/açıklama/şehir/motor tipi). RLS: is_club_admin.
 *  Abonelik/kapasite kolonları clubUpdateSchema'da yok → trigger korumasına takılmaz. */
export async function updateClubProfile(
  raw: z.infer<typeof profileInputSchema>,
): Promise<ActionResult> {
  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('clubs')
    .update(parsed.data.data)
    .eq('id', parsed.data.clubId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clubs/${parsed.data.clubId}`);
  return { ok: true };
}

// === Abonelik yükseltme / yenileme ===
export type CheckoutResult = { ok: true; token: string } | { ok: false; error: string };

const upgradeInputSchema = z.object({
  clubId: z.string().uuid(),
  tierId: z.string(),
  period: billingPeriodSchema,
});

/**
 * Yükseltme/yenileme ödemesini başlatır (CLAUDE.md Bölüm 2). Yalnızca kulüp SAHİBİ.
 * Yeni paket için 'pending' abonelik oluşturulur, fark tutarı sunucuda hesaplanır,
 * PayTR token'ı döner. Onay webhook ile gelince kulüp yeni pakete geçer.
 */
export async function startUpgrade(
  raw: z.infer<typeof upgradeInputSchema>,
): Promise<CheckoutResult> {
  const parsed = upgradeInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const { clubId, tierId, period } = parsed.data;

  const tier = DEFAULT_CAPACITY_TIERS.find((t) => t.id === tierId);
  if (!tier) return { ok: false, error: 'Geçersiz paket' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Oturum bulunamadı' };

  const { data: clubRow } = await supabase
    .from('clubs')
    .select(
      'id, name, description, city, moto_type, logo_url, owner_id, capacity, member_count, subscription_status, subscription_tier, subscription_expires_at, created_at',
    )
    .eq('id', clubId)
    .maybeSingle();
  if (!clubRow) return { ok: false, error: 'Kulüp bulunamadı' };
  const club = clubSchema.parse(clubRow);

  // Yalnızca sahip yükseltebilir (faturalandırma).
  if (club.owner_id !== user.id) return { ok: false, error: 'Yalnızca kulüp sahibi yükseltebilir' };

  const newCapacity = tierCapacity(tier);
  // Aynı tier = yenileme; daha yüksek = yükseltme. Düşürme bu akıştan yapılamaz.
  if (newCapacity < club.capacity) {
    return { ok: false, error: 'Bu paket mevcut kapasitenin altında. Düşürme desteklenmiyor.' };
  }

  // Fark tutarı (sunucu otoritesi).
  const amount = computeUpgradeAmount({
    tiers: DEFAULT_CAPACITY_TIERS,
    currentTierId: club.subscription_status === 'active' ? club.subscription_tier : null,
    currentExpiresAt: club.subscription_status === 'active' ? club.subscription_expires_at : null,
    newTierId: tier.id,
    period,
  });

  const merchantOid = ('MK' + randomUUID().replace(/-/g, '')).slice(0, 64);
  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc('create_upgrade_subscription', {
    p_club_id: clubId,
    p_tier: tier.id,
    p_capacity: newCapacity,
    p_amount: amount,
    p_period: period,
    p_merchant_oid: merchantOid,
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const userIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

  try {
    const token = await createPaytrToken({
      merchantOid,
      // Yenileme/düşük-fark durumunda PayTR minimum tutar ister; en az 1₺ tahsil et.
      amount: Math.max(1, amount),
      email: user.email,
      userIp,
      userName: club.name,
      productLabel: `${tier.label} yükseltme (${period === 'yearly' ? 'Yıllık' : 'Aylık'})`,
      okUrl: `${origin}/clubs/${clubId}?paid=1`,
      failUrl: `${origin}/clubs/${clubId}?failed=1`,
      testMode: process.env.NODE_ENV !== 'production',
    });
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ödeme başlatılamadı' };
  }
}

/** Logo yüklemesi sonrası clubs.logo_url'i ayarla (URL client tarafında Storage'dan alınır). */
export async function setClubLogo(raw: { clubId: string; url: string }): Promise<ActionResult> {
  const parsed = z.object({ clubId: z.string().uuid(), url: z.string().url() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Geçersiz istek' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('clubs')
    .update({ logo_url: parsed.data.url })
    .eq('id', parsed.data.clubId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clubs/${parsed.data.clubId}`);
  return { ok: true };
}
