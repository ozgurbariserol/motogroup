import { z } from 'zod';
import { billingPeriodSchema, subscriptionPaymentStatusSchema } from '../enums';
import { timestampSchema, uuidSchema } from '../primitives';

/**
 * Ödeme kaydı (web / PayTR). Bu satırları YALNIZCA sunucu/webhook yazar
 * (Bölüm 4). Client tarafı bu şemayı yalnızca okuma/gösterim için kullanır;
 * status/amount gibi alanlara client'tan güvenilmez.
 */
export const subscriptionSchema = z.object({
  id: uuidSchema,
  club_id: uuidSchema,
  tier: z.string(),
  capacity: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  status: subscriptionPaymentStatusSchema,
  paytr_merchant_oid: z.string().nullable(),
  period: billingPeriodSchema,
  starts_at: timestampSchema.nullable(),
  expires_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});
export type Subscription = z.infer<typeof subscriptionSchema>;

/**
 * Web panelinden ödeme başlatma girdisi (kapasite paketi + periyot seçimi).
 * Tutar/kapasite sunucuda seçilen tier'dan türetilir — client'tan fiyat alınmaz.
 */
export const checkoutInputSchema = z.object({
  club_id: uuidSchema,
  tier_id: z.string(),
  period: billingPeriodSchema,
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
