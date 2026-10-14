import { messageSendSchema } from '@motogroup/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Sohbet hedefi: ya kulüp ya etkinlik (tam biri).
export type ChatTarget = { clubId: string } | { eventId: string };

function targetColumn(target: ChatTarget): { col: 'club_id' | 'event_id'; value: string } {
  return 'clubId' in target
    ? { col: 'club_id', value: target.clubId }
    : { col: 'event_id', value: target.eventId };
}

function messagesKey(target: ChatTarget) {
  return 'clubId' in target
    ? (['messages', 'club', target.clubId] as const)
    : (['messages', 'event', target.eventId] as const);
}

const messageRowSchema = z.object({
  id: z.string().uuid(),
  club_id: z.string().uuid().nullable(),
  event_id: z.string().uuid().nullable(),
  sender_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
  author: z.object({ display_name: z.string() }).nullable(),
});
export type ChatMessage = z.infer<typeof messageRowSchema>;

const SELECT_COLS =
  'id, club_id, event_id, sender_id, content, created_at, author:profiles(display_name)';

// sender_id → display_name önbelleği (realtime payload'ı yazarı içermez).
const displayNameCache = new Map<string, string>();

async function resolveDisplayName(senderId: string): Promise<string> {
  const cached = displayNameCache.get(senderId);
  if (cached) return cached;
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', senderId)
    .maybeSingle();
  const name = data?.display_name ?? 'Üye';
  displayNameCache.set(senderId, name);
  return name;
}

export function useMessages(target: ChatTarget) {
  const { col, value } = targetColumn(target);
  return useQuery<ChatMessage[]>({
    queryKey: messagesKey(target),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(SELECT_COLS)
        .eq(col, value)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      const rows = z.array(messageRowSchema).parse(data ?? []);
      // Yazar adlarını önbelleğe al (realtime için).
      for (const m of rows) {
        if (m.author) displayNameCache.set(m.sender_id, m.author.display_name);
      }
      return rows;
    },
  });
}

export function useSendMessage(target: ChatTarget) {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      // Bölüm 4: club_id/event_id'den tam biri dolu olmalı.
      const payload =
        'clubId' in target
          ? messageSendSchema.parse({ club_id: target.clubId, content })
          : messageSendSchema.parse({ event_id: target.eventId, content });
      const { error } = await supabase.from('messages').insert({ ...payload, sender_id: userId });
      if (error) throw error;
      // Eklemeyi realtime aboneliği yapar (dedupe id ile).
    },
  });
}

/**
 * Realtime abonelik — yeni mesajları React Query önbelleğine ekler.
 * postgres_changes RLS'e saygı duyar: yalnızca üye olunan sohbetin mesajları gelir.
 */
export function useRealtimeMessages(target: ChatTarget) {
  const queryClient = useQueryClient();
  const { col, value } = targetColumn(target);

  useEffect(() => {
    const key =
      col === 'club_id'
        ? (['messages', 'club', value] as const)
        : (['messages', 'event', value] as const);
    const channel = supabase
      .channel(`messages:${col}:${value}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `${col}=eq.${value}` },
        (payload) => {
          const parsed = messageRowSchema.omit({ author: true }).safeParse(payload.new);
          if (!parsed.success) return;
          const row = parsed.data;

          void resolveDisplayName(row.sender_id).then((display_name) => {
            queryClient.setQueryData<ChatMessage[]>(key, (prev) => {
              const existing = prev ?? [];
              if (existing.some((m) => m.id === row.id)) return existing; // dedupe
              return [...existing, { ...row, author: { display_name } }];
            });
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // col/value değişirse yeniden abone ol.
  }, [col, value, queryClient]);
}
