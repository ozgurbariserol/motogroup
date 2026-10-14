import { z } from 'zod';
import { timestampSchema, uuidSchema } from '../primitives';

const messageContentSchema = z.string().trim().min(1).max(4000);

export const messageSchema = z.object({
  id: uuidSchema,
  club_id: uuidSchema.nullable(),
  event_id: uuidSchema.nullable(),
  sender_id: uuidSchema,
  content: messageContentSchema,
  created_at: timestampSchema,
});
export type Message = z.infer<typeof messageSchema>;

/**
 * Mesaj gönderme. club_id ve event_id'den TAM BİRİ dolu olmalı
 * (DB CHECK constraint ile birebir — messages_exactly_one_target).
 */
export const messageSendSchema = z
  .object({
    club_id: uuidSchema.optional(),
    event_id: uuidSchema.optional(),
    content: messageContentSchema,
  })
  .refine((m) => (m.club_id != null) !== (m.event_id != null), {
    message: 'Mesaj ya kulübe ya da etkinliğe ait olmalı (tam biri).',
    path: ['club_id'],
  });
export type MessageSend = z.infer<typeof messageSendSchema>;
