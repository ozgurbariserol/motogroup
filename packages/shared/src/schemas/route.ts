import { z } from 'zod';
import { routeDifficultySchema } from '../enums';
import {
  geoPointSchema,
  longTextSchema,
  shortTextSchema,
  timestampSchema,
  uuidSchema,
} from '../primitives';

export const routeSchema = z.object({
  id: uuidSchema,
  creator_id: uuidSchema,
  club_id: uuidSchema.nullable(), // kişisel rota olabilir
  title: shortTextSchema,
  description: longTextSchema.nullable(),
  distance_km: z.number().nonnegative().nullable(),
  difficulty: routeDifficultySchema.nullable(),
  moto_type: z.string().trim().max(50).nullable(),
  gpx_url: z.string().url().nullable(), // Supabase Storage
  start_location: geoPointSchema.nullable(),
  created_at: timestampSchema,
});
export type Route = z.infer<typeof routeSchema>;

/** Rota oluşturma (GPX yükle veya haritadan çiz). creator_id sunucuda. */
export const routeCreateSchema = routeSchema
  .pick({
    club_id: true,
    title: true,
    description: true,
    distance_km: true,
    difficulty: true,
    moto_type: true,
    gpx_url: true,
    start_location: true,
  })
  .partial({
    club_id: true,
    description: true,
    distance_km: true,
    difficulty: true,
    moto_type: true,
    gpx_url: true,
    start_location: true,
  });
export type RouteCreate = z.infer<typeof routeCreateSchema>;

export const routeUpdateSchema = routeCreateSchema.partial();
export type RouteUpdate = z.infer<typeof routeUpdateSchema>;
