import { z } from 'zod';
import { shortTextSchema, timestampSchema, uuidSchema } from '../primitives';

const currentYear = new Date().getFullYear();

export const motorcycleSchema = z.object({
  id: uuidSchema,
  profile_id: uuidSchema,
  brand: shortTextSchema,
  model: shortTextSchema,
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 1)
    .nullable(),
  cc: z.number().int().positive().max(3000).nullable(),
  is_primary: z.boolean(),
  created_at: timestampSchema,
});
export type Motorcycle = z.infer<typeof motorcycleSchema>;

/** Onboarding'de motor ekleme (CLAUDE.md Bölüm 5: marka/model/yıl/cc). */
export const motorcycleCreateSchema = motorcycleSchema
  .pick({ brand: true, model: true, year: true, cc: true, is_primary: true })
  .partial({ year: true, cc: true, is_primary: true });
export type MotorcycleCreate = z.infer<typeof motorcycleCreateSchema>;
