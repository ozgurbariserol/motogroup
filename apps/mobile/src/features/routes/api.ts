import {
  routeCommentCreateSchema,
  routeDifficultySchema,
  routeSchema,
  type GeoPoint,
  type Route,
  type RouteDifficulty,
} from '@motogroup/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { parseGpxPoints, totalDistanceKm } from '@/lib/gpx';
import { supabase } from '@/lib/supabase';

const routeViewRowSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  club_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  distance_km: z.coerce.number().nullable(),
  difficulty: routeDifficultySchema.nullable(),
  moto_type: z.string().nullable(),
  gpx_url: z.string().nullable(),
  start_lat: z.coerce.number().nullable(),
  start_lng: z.coerce.number().nullable(),
  created_at: z.string(),
});

function toRoute(row: z.infer<typeof routeViewRowSchema>): Route {
  const start_location =
    row.start_lat != null && row.start_lng != null
      ? { lat: row.start_lat, lng: row.start_lng }
      : null;
  return routeSchema.parse({
    id: row.id,
    creator_id: row.creator_id,
    club_id: row.club_id,
    title: row.title,
    description: row.description,
    distance_km: row.distance_km,
    difficulty: row.difficulty,
    moto_type: row.moto_type,
    gpx_url: row.gpx_url,
    start_location,
    created_at: row.created_at,
  });
}

const VIEW_COLUMNS =
  'id, creator_id, club_id, title, description, distance_km, difficulty, moto_type, gpx_url, start_lat, start_lng, created_at';

export function useRoutes() {
  return useQuery<Route[]>({
    queryKey: ['routes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes_view')
        .select(VIEW_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return z
        .array(routeViewRowSchema)
        .parse(data ?? [])
        .map(toRoute);
    },
  });
}

export function useNearbyRoutes(location: GeoPoint | null, radiusM = 100000) {
  return useQuery<Route[]>({
    queryKey: ['routes', 'nearby', location?.lat, location?.lng, radiusM],
    enabled: !!location,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('routes_nearby', {
        p_lat: location!.lat,
        p_lng: location!.lng,
        p_radius_m: radiusM,
      });
      if (error) throw error;
      return z
        .array(routeViewRowSchema)
        .parse(data ?? [])
        .map(toRoute);
    },
  });
}

export function useRoute(routeId: string | undefined) {
  return useQuery<Route | null>({
    queryKey: ['routes', 'detail', routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes_view')
        .select(VIEW_COLUMNS)
        .eq('id', routeId!)
        .maybeSingle();
      if (error) throw error;
      return data ? toRoute(routeViewRowSchema.parse(data)) : null;
    },
  });
}

/** GPX dosyasını indirip noktalara çevirir (haritada polyline çizmek için). */
export function useRouteGpxPoints(gpxUrl: string | null | undefined) {
  return useQuery<GeoPoint[]>({
    queryKey: ['routes', 'gpx', gpxUrl],
    enabled: !!gpxUrl,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch(gpxUrl!);
      const text = await res.text();
      return parseGpxPoints(text);
    },
  });
}

type CreateRouteInput = {
  title: string;
  description?: string;
  difficulty?: RouteDifficulty;
  moto_type?: string;
  club_id?: string | null;
  /** Rota noktaları (haritadan çizim veya GPX'ten parse edilmiş). */
  points: GeoPoint[];
  /** Yüklenecek GPX metni. */
  gpxString: string;
};

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRouteInput) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      if (input.points.length === 0) throw new Error('Rota için en az bir nokta gerekli');

      // 1) GPX'i Storage'a yükle (kendi klasörüne: {userId}/...).
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.gpx`;
      const { error: uploadError } = await supabase.storage
        .from('gpx')
        .upload(path, input.gpxString, { contentType: 'application/gpx+xml', upsert: false });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('gpx').getPublicUrl(path);

      // 2) Başlangıç noktası ve mesafe.
      const start = input.points[0]!;
      const distance = totalDistanceKm(input.points);
      const start_location = `SRID=4326;POINT(${start.lng} ${start.lat})`;

      // 3) routes kaydı (RLS: creator_id = auth.uid()).
      const { data, error } = await supabase
        .from('routes')
        .insert({
          creator_id: userId,
          club_id: input.club_id ?? null,
          title: input.title,
          description: input.description ?? null,
          distance_km: distance,
          difficulty: input.difficulty ?? null,
          moto_type: input.moto_type ?? null,
          gpx_url: pub.publicUrl,
          start_location,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

// --- Favoriler ---
export function useIsFavorite(routeId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<boolean>({
    queryKey: ['routes', 'favorite', routeId, userId],
    enabled: !!routeId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_favorites')
        .select('route_id')
        .eq('route_id', routeId!)
        .eq('profile_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useToggleFavorite(routeId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (makeFavorite: boolean) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      if (makeFavorite) {
        const { error } = await supabase
          .from('route_favorites')
          .insert({ route_id: routeId, profile_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('route_favorites')
          .delete()
          .eq('route_id', routeId)
          .eq('profile_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', 'favorite', routeId] });
    },
  });
}

// --- Yorumlar ---
const routeCommentRowSchema = z.object({
  id: z.string().uuid(),
  route_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
  author: z.object({ display_name: z.string() }).nullable(),
});
export type RouteCommentRow = z.infer<typeof routeCommentRowSchema>;

export function useRouteComments(routeId: string | undefined) {
  return useQuery<RouteCommentRow[]>({
    queryKey: ['routes', 'comments', routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_comments')
        .select('id, route_id, profile_id, content, created_at, author:profiles(display_name)')
        .eq('route_id', routeId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return z.array(routeCommentRowSchema).parse(data ?? []);
    },
  });
}

export function useAddRouteComment(routeId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const payload = routeCommentCreateSchema.parse({ route_id: routeId, content });
      const { error } = await supabase
        .from('route_comments')
        .insert({ ...payload, profile_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', 'comments', routeId] });
    },
  });
}
