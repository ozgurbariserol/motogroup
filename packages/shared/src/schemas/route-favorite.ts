import { z } from 'zod';
import { timestampSchema, uuidSchema } from '../primitives';

export const routeFavoriteSchema = z.object({
  route_id: uuidSchema,
  profile_id: uuidSchema,
  created_at: timestampSchema,
});
export type RouteFavorite = z.infer<typeof routeFavoriteSchema>;

/** Favori ekleme/çıkarma (profile_id sunucuda auth.uid()'den). */
export const routeFavoriteToggleSchema = routeFavoriteSchema.pick({ route_id: true });
export type RouteFavoriteToggle = z.infer<typeof routeFavoriteToggleSchema>;
