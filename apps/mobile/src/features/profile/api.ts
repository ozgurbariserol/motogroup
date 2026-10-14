import { motorcycleSchema, type Motorcycle, type MotorcycleCreate } from '@motogroup/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// === Motosikletler ===
export function useMyMotorcycles() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<Motorcycle[]>({
    queryKey: ['motorcycles', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motorcycles')
        .select('id, profile_id, brand, model, year, cc, is_primary, created_at')
        .eq('profile_id', userId!)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return z.array(motorcycleSchema).parse(data ?? []);
    },
  });
}

export function useAddMotorcycle() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: MotorcycleCreate) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      // İlk motor değilse ve birincil işaretlendiyse, eski birincili kaldır.
      if (input.is_primary) {
        await supabase.from('motorcycles').update({ is_primary: false }).eq('profile_id', userId);
      }
      const { error } = await supabase.from('motorcycles').insert({ profile_id: userId, ...input });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motorcycles'] }),
  });
}

export function useDeleteMotorcycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (motorcycleId: string) => {
      const { error } = await supabase.from('motorcycles').delete().eq('id', motorcycleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['motorcycles'] }),
  });
}

// === Etkinliklerim (katıldığım/ilgilendiğim) ===
const myEventRowSchema = z.object({
  status: z.enum(['going', 'not_going', 'maybe']),
  event: z.object({ id: z.string().uuid(), title: z.string(), start_time: z.string() }).nullable(),
});
export type MyEventRow = z.infer<typeof myEventRowSchema>;

export function useMyEvents() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<MyEventRow[]>({
    queryKey: ['my-events', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('status, event:events(id, title, start_time)')
        .eq('profile_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return z.array(myEventRowSchema).parse(data ?? []);
    },
  });
}

// === Rotalarım + favorilerim ===
const routeLiteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  distance_km: z.coerce.number().nullable(),
  difficulty: z.string().nullable(),
  moto_type: z.string().nullable(),
});
export type RouteLite = z.infer<typeof routeLiteSchema>;
const ROUTE_LITE = 'id, title, distance_km, difficulty, moto_type';

export function useMyRoutes() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<RouteLite[]>({
    queryKey: ['my-routes', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select(ROUTE_LITE)
        .eq('creator_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return z.array(routeLiteSchema).parse(data ?? []);
    },
  });
}

export function useMyFavoriteRoutes() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<RouteLite[]>({
    queryKey: ['my-favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_favorites')
        .select(`route:routes(${ROUTE_LITE})`)
        .eq('profile_id', userId!);
      if (error) throw error;
      const rows = z.array(z.object({ route: routeLiteSchema.nullable() })).parse(data ?? []);
      return rows.map((r) => r.route).filter((r): r is RouteLite => r !== null);
    },
  });
}
