import { z } from 'zod';

// Bölüm 4 şemasındaki text alanların izinli değerleri. DB CHECK constraint'leri ile
// birebir aynı tutulmalı — değişiklik olursa hem burada hem migration'da güncellenir.

export const clubRoleSchema = z.enum(['owner', 'admin', 'member']);
export type ClubRole = z.infer<typeof clubRoleSchema>;

export const memberStatusSchema = z.enum(['pending', 'active']);
export type MemberStatus = z.infer<typeof memberStatusSchema>;

export const rsvpStatusSchema = z.enum(['going', 'not_going', 'maybe']);
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;

export const routeDifficultySchema = z.enum(['kolay', 'orta', 'zor']);
export type RouteDifficulty = z.infer<typeof routeDifficultySchema>;

export const subscriptionStatusSchema = z.enum(['active', 'expired', 'pending']);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionPaymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);
export type SubscriptionPaymentStatus = z.infer<typeof subscriptionPaymentStatusSchema>;

export const billingPeriodSchema = z.enum(['monthly', 'yearly']);
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

// Motor tipi serbest metin (DB'de constraint yok) ama UI tutarlılığı için öneri listesi.
export const motoTypeSchema = z.enum([
  'adventure',
  'chopper',
  'sport',
  'touring',
  'naked',
  'cafe_racer',
  'enduro',
  'scooter',
  'classic',
]);
export type MotoType = z.infer<typeof motoTypeSchema>;
