import { z } from 'zod';
import { rsvpStatusSchema } from '../enums';
import {
  geoPointSchema,
  longTextSchema,
  shortTextSchema,
  timestampSchema,
  uuidSchema,
} from '../primitives';

export const eventSchema = z.object({
  id: uuidSchema,
  club_id: uuidSchema,
  creator_id: uuidSchema,
  title: shortTextSchema,
  description: longTextSchema.nullable(),
  start_time: timestampSchema,
  /** geography(Point,4326) → API'de lat/lng. Buluşma noktası harita pini. */
  meeting_location: geoPointSchema.nullable(),
  meeting_address: z.string().trim().max(300).nullable(),
  created_at: timestampSchema,
});
export type Event = z.infer<typeof eventSchema>;

/** Etkinlik oluşturma (owner/admin). creator_id sunucuda auth.uid()'den gelir. */
export const eventCreateSchema = eventSchema
  .pick({
    club_id: true,
    title: true,
    description: true,
    start_time: true,
    meeting_location: true,
    meeting_address: true,
  })
  .partial({ description: true, meeting_location: true, meeting_address: true });
export type EventCreate = z.infer<typeof eventCreateSchema>;

export const eventUpdateSchema = eventCreateSchema.omit({ club_id: true }).partial();
export type EventUpdate = z.infer<typeof eventUpdateSchema>;

// --- RSVP ---
export const eventAttendeeSchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  profile_id: uuidSchema,
  status: rsvpStatusSchema,
  created_at: timestampSchema,
});
export type EventAttendee = z.infer<typeof eventAttendeeSchema>;

export const rsvpSchema = eventAttendeeSchema.pick({ event_id: true, status: true });
export type Rsvp = z.infer<typeof rsvpSchema>;
