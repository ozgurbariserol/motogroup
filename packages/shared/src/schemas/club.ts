import { z } from 'zod';
import { subscriptionStatusSchema } from '../enums';
import { longTextSchema, shortTextSchema, timestampSchema, uuidSchema } from '../primitives';

export const clubSchema = z.object({
  id: uuidSchema,
  name: shortTextSchema,
  description: longTextSchema.nullable(),
  city: z.string().trim().max(100).nullable(),
  moto_type: z.string().trim().max(50).nullable(),
  logo_url: z.string().url().nullable(),
  owner_id: uuidSchema,
  capacity: z.number().int().nonnegative(),
  member_count: z.number().int().nonnegative(),
  subscription_status: subscriptionStatusSchema,
  subscription_tier: z.string().nullable(),
  subscription_expires_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});
export type Club = z.infer<typeof clubSchema>;

/**
 * Kulüp oluşturma (yalnızca web paneli — Bölüm 2). Abonelik/kapasite alanları
 * BURADA YOK: onları yalnızca sunucu/PayTR webhook belirler (Bölüm 4).
 */
export const clubCreateSchema = clubSchema
  .pick({ name: true, description: true, city: true, moto_type: true, logo_url: true })
  .partial({ description: true, city: true, moto_type: true, logo_url: true });
export type ClubCreate = z.infer<typeof clubCreateSchema>;

/** Kulüp profili düzenleme (owner/admin). Abonelik alanları yine hariç. */
export const clubUpdateSchema = clubCreateSchema.partial();
export type ClubUpdate = z.infer<typeof clubUpdateSchema>;
