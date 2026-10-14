import { z } from 'zod';
import { timestampSchema, uuidSchema } from '../primitives';

const commentContentSchema = z.string().trim().min(1).max(2000);

export const routeCommentSchema = z.object({
  id: uuidSchema,
  route_id: uuidSchema,
  profile_id: uuidSchema,
  content: commentContentSchema,
  created_at: timestampSchema,
});
export type RouteComment = z.infer<typeof routeCommentSchema>;

export const routeCommentCreateSchema = routeCommentSchema.pick({
  route_id: true,
  content: true,
});
export type RouteCommentCreate = z.infer<typeof routeCommentCreateSchema>;

export const eventCommentSchema = z.object({
  id: uuidSchema,
  event_id: uuidSchema,
  profile_id: uuidSchema,
  content: commentContentSchema,
  created_at: timestampSchema,
});
export type EventComment = z.infer<typeof eventCommentSchema>;

export const eventCommentCreateSchema = eventCommentSchema.pick({
  event_id: true,
  content: true,
});
export type EventCommentCreate = z.infer<typeof eventCommentCreateSchema>;
