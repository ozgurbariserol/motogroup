import { z } from 'zod';
import type { BillingPeriod } from './enums';

// ⚠️ CLAUDE.md Bölüm 2 & 9: fiyat ve kapasite rakamları PLACEHOLDER ve kolayca
// değişebilir olmalı. Kaynak gerçek (source of truth) DB/config'tir; aşağıdakiler
// yalnızca DB okunamadığında kullanılacak VARSAYILAN değerlerdir, hard-code fiyat
// mantığı DEĞİLDİR. Kullanıcıya "kapasite paketi" olarak sunulur, "kişi başı" değil.

export const CURRENCY = 'TRY' as const;

export const capacityTierSchema = z.object({
  /** Stabil tanımlayıcı — DB/PayTR eşlemesinde kullanılır. */
  id: z.string(),
  /** Kullanıcıya görünen ad (Türkçe). */
  label: z.string(),
  /** Üye limiti. null = sınırsız (Chapter). */
  memberLimit: z.number().int().positive().nullable(),
  monthlyPrice: z.number().nonnegative(),
  yearlyPrice: z.number().nonnegative(),
});
export type CapacityTier = z.infer<typeof capacityTierSchema>;

/**
 * Varsayılan kapasite paketleri (fallback). Gerçek değerler DB'den okunmalı.
 * Mobil app bunları SATIŞ için göstermez (Bölüm 2 anti-steering); yalnızca web
 * paneli paket seçimi ve abonelik durumu gösteriminde kullanır.
 */
export const DEFAULT_CAPACITY_TIERS: readonly CapacityTier[] = [
  { id: 'starter', label: 'Başlangıç', memberLimit: 50, monthlyPrice: 500, yearlyPrice: 5000 },
  { id: 'club', label: 'Kulüp', memberLimit: 150, monthlyPrice: 900, yearlyPrice: 9000 },
  {
    id: 'big_club',
    label: 'Büyük Kulüp',
    memberLimit: 400,
    monthlyPrice: 1500,
    yearlyPrice: 15000,
  },
  { id: 'chapter', label: 'Chapter', memberLimit: null, monthlyPrice: 2500, yearlyPrice: 25000 },
] as const;

/** Sınırsız (Chapter) paketin kapasite sentinel'i — DB int kolonunda "sınırsızı" temsil eder. */
export const UNLIMITED_CAPACITY = 1_000_000;

export function tierPrice(tier: CapacityTier, period: BillingPeriod): number {
  return period === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
}

export function tierCapacity(tier: CapacityTier): number {
  return tier.memberLimit ?? UNLIMITED_CAPACITY;
}

/**
 * Yükseltme/yenileme için tahsil edilecek tutar (CLAUDE.md Bölüm 2: "fark hesaplanıp
 * tahsil edilir"). Yeni paketin tam fiyatından, mevcut aboneliğin KULLANILMAMIŞ süresine
 * orantılı kredi düşülür. Saf (pure) fonksiyon; hem web UI hem sunucu aynı sonucu kullanır.
 */
export function computeUpgradeAmount(args: {
  tiers: readonly CapacityTier[];
  currentTierId: string | null;
  currentExpiresAt: string | null; // ISO
  newTierId: string;
  period: BillingPeriod;
  now?: Date;
}): number {
  const { tiers, currentTierId, currentExpiresAt, newTierId, period } = args;
  const now = args.now ?? new Date();
  const newTier = tiers.find((t) => t.id === newTierId);
  if (!newTier) return 0;

  const newPrice = tierPrice(newTier, period);
  const periodDays = period === 'yearly' ? 365 : 30;
  const dayMs = 24 * 60 * 60 * 1000;

  let credit = 0;
  const current = currentTierId ? tiers.find((t) => t.id === currentTierId) : undefined;
  if (current && currentExpiresAt) {
    const remainingDays = Math.max(
      0,
      (new Date(currentExpiresAt).getTime() - now.getTime()) / dayMs,
    );
    const ratio = Math.min(1, remainingDays / periodDays);
    credit = tierPrice(current, period) * ratio;
  }

  return Math.max(0, Math.round(newPrice - credit));
}
