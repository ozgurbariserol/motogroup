import { z } from 'zod';
import { shortTextSchema, timestampSchema, uuidSchema } from '../primitives';

export const profileSchema = z.object({
  id: uuidSchema,
  display_name: shortTextSchema,
  city: z.string().trim().max(100).nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: timestampSchema,
});
export type Profile = z.infer<typeof profileSchema>;

/** Profil oluşturma/güncelleme (kullanıcı yalnızca kendi satırını düzenler). */
export const profileUpsertSchema = profileSchema
  .pick({ display_name: true, city: true, avatar_url: true })
  .partial({ city: true, avatar_url: true });
export type ProfileUpsert = z.infer<typeof profileUpsertSchema>;
