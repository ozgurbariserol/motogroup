import { z } from 'zod';

// Ortak primitive şemalar — tablo şemaları bunları yeniden kullanır.

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });

/**
 * Konum noktası. DB'de geography(Point, 4326) olarak saklanır; client/API tarafında
 * lat/lng olarak taşınır. Postgres'e yazarken ST_SetSRID(ST_MakePoint(lng, lat), 4326)
 * şeklinde dönüştürülür (lng, lat sırası önemli).
 */
export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Kullanıcıya görünen kısa metin alanları için ortak sınır. */
export const shortTextSchema = z.string().trim().min(1).max(200);
export const longTextSchema = z.string().trim().max(5000);
