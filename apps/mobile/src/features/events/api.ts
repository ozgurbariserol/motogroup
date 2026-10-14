import {
  eventCommentCreateSchema,
  eventSchema,
  rsvpSchema,
  type Event,
  type GeoPoint,
  type RsvpStatus,
} from '@motogroup/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// events_view satırını paylaşılan Event tipine dönüştürür (lat/lng → GeoPoint).
const eventViewRowSchema = z.object({
  id: z.string().uuid(),
  club_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.string(),
  meeting_lat: z.number().nullable(),
  meeting_lng: z.number().nullable(),
  meeting_address: z.string().nullable(),
  created_at: z.string(),
});

function toEvent(row: z.infer<typeof eventViewRowSchema>): Event {
  const meeting_location =
    row.meeting_lat != null && row.meeting_lng != null
      ? { lat: row.meeting_lat, lng: row.meeting_lng }
      : null;
  return eventSchema.parse({
    id: row.id,
    club_id: row.club_id,
    creator_id: row.creator_id,
    title: row.title,
    description: row.description,
    start_time: row.start_time,
    meeting_location,
    meeting_address: row.meeting_address,
    created_at: row.created_at,
  });
}

const VIEW_COLUMNS =
  'id, club_id, creator_id, title, description, start_time, meeting_lat, meeting_lng, meeting_address, created_at';

/** Üye olunan kulüplerin yaklaşan etkinlikleri (RLS yalnızca üye kulüpleri döner). */
export function useUpcomingEvents() {
  return useQuery<Event[]>({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_view')
        .select(VIEW_COLUMNS)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      return z
        .array(eventViewRowSchema)
        .parse(data ?? [])
        .map(toEvent);
    },
  });
}

/** Belirli bir kulübün yaklaşan etkinlikleri. */
export function useClubEvents(clubId: string | undefined) {
  return useQuery<Event[]>({
    queryKey: ['events', 'club', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_view')
        .select(VIEW_COLUMNS)
        .eq('club_id', clubId!)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return z
        .array(eventViewRowSchema)
        .parse(data ?? [])
        .map(toEvent);
    },
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery<Event | null>({
    queryKey: ['events', 'detail', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_view')
        .select(VIEW_COLUMNS)
        .eq('id', eventId!)
        .maybeSingle();
      if (error) throw error;
      return data ? toEvent(eventViewRowSchema.parse(data)) : null;
    },
  });
}

/** Yakınımdaki etkinlikler (PostGIS ST_DWithin RPC). */
export function useNearbyEvents(location: GeoPoint | null, radiusM = 50000) {
  return useQuery<Event[]>({
    queryKey: ['events', 'nearby', location?.lat, location?.lng, radiusM],
    enabled: !!location,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('events_nearby', {
        p_lat: location!.lat,
        p_lng: location!.lng,
        p_radius_m: radiusM,
      });
      if (error) throw error;
      return z
        .array(eventViewRowSchema)
        .parse(data ?? [])
        .map(toEvent);
    },
  });
}

type CreateEventInput = {
  club_id: string;
  title: string;
  description?: string;
  start_time: string; // ISO
  meeting_location?: GeoPoint | null;
  meeting_address?: string | null;
};

/** Etkinlik oluşturma (owner/admin — RLS zorlar). Konum EWKT olarak yazılır. */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');

      const meeting_location = input.meeting_location
        ? `SRID=4326;POINT(${input.meeting_location.lng} ${input.meeting_location.lat})`
        : null;

      const { data, error } = await supabase
        .from('events')
        .insert({
          club_id: input.club_id,
          creator_id: userId,
          title: input.title,
          description: input.description ?? null,
          start_time: input.start_time,
          meeting_location,
          meeting_address: input.meeting_address ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// --- RSVP ---
export function useMyRsvp(eventId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<RsvpStatus | null>({
    queryKey: ['events', 'rsvp', eventId, userId],
    enabled: !!eventId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('status')
        .eq('event_id', eventId!)
        .eq('profile_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ? rsvpSchema.shape.status.parse(data.status) : null;
    },
  });
}

export function useSetRsvp(eventId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (status: RsvpStatus) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { error } = await supabase
        .from('event_attendees')
        .upsert(
          { event_id: eventId, profile_id: userId, status },
          { onConflict: 'event_id,profile_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'rsvp', eventId] });
    },
  });
}

// --- Yorumlar ---
const eventCommentRowSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
  author: z.object({ display_name: z.string() }).nullable(),
});
export type EventCommentRow = z.infer<typeof eventCommentRowSchema>;

export function useEventComments(eventId: string | undefined) {
  return useQuery<EventCommentRow[]>({
    queryKey: ['events', 'comments', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_comments')
        .select('id, event_id, profile_id, content, created_at, author:profiles(display_name)')
        .eq('event_id', eventId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return z.array(eventCommentRowSchema).parse(data ?? []);
    },
  });
}

export function useAddEventComment(eventId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const payload = eventCommentCreateSchema.parse({ event_id: eventId, content });
      const { error } = await supabase
        .from('event_comments')
        .insert({ ...payload, profile_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'comments', eventId] });
    },
  });
}
