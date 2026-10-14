import {
  clubMemberSchema,
  clubSchema,
  type Club,
  type ClubRole,
  type MemberStatus,
} from '@motogroup/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CLUB_COLUMNS =
  'id, name, description, city, moto_type, logo_url, owner_id, capacity, member_count, subscription_status, subscription_tier, subscription_expires_at, created_at';

const membershipRowSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
  club: clubSchema,
});

/** Kullanıcının aktif üye olduğu kulüpler (rolüyle birlikte). */
export function useMyClubs() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<{ role: 'owner' | 'admin' | 'member'; club: Club }[]>({
    queryKey: ['clubs', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select(`role, club:clubs(${CLUB_COLUMNS})`)
        .eq('profile_id', userId!)
        .eq('status', 'active');
      if (error) throw error;
      return z.array(membershipRowSchema).parse(data ?? []);
    },
  });
}

/** Kullanıcının owner/admin olduğu kulüpler (etkinlik oluşturma için). */
export function useMyAdminClubs() {
  const all = useMyClubs();
  return {
    ...all,
    data: all.data?.filter((m) => m.role === 'owner' || m.role === 'admin').map((m) => m.club),
  };
}

/**
 * Kulüp keşfi/arama. RLS clubs SELECT herkese açık (keşfedilebilir). İsteğe bağlı
 * metin filtresi (ad veya şehir). Not: clubs tablosunda geography kolonu yok →
 * "yakındaki kulüp" PostGIS yerine şehir eşlemesiyle yapılır (v2'de geo eklenebilir).
 */
export function useDiscoverClubs(search: string) {
  const term = search.trim();
  return useQuery<Club[]>({
    queryKey: ['clubs', 'discover', term],
    queryFn: async () => {
      let query = supabase
        .from('clubs')
        .select(CLUB_COLUMNS)
        .order('member_count', { ascending: false })
        .limit(50);
      if (term.length > 0) {
        query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return z.array(clubSchema).parse(data ?? []);
    },
  });
}

/** Tek kulüp (profil). */
export function useClub(clubId: string | undefined) {
  return useQuery<Club | null>({
    queryKey: ['clubs', 'detail', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select(CLUB_COLUMNS)
        .eq('id', clubId!)
        .maybeSingle();
      if (error) throw error;
      return data ? clubSchema.parse(data) : null;
    },
  });
}

const memberRowSchema = clubMemberSchema
  .pick({ profile_id: true, role: true, status: true, joined_at: true })
  .extend({
    profile: z.object({ display_name: z.string(), city: z.string().nullable() }).nullable(),
  });
export type ClubMemberRow = z.infer<typeof memberRowSchema>;

/** Kulüp üye listesi. RLS: yalnızca aktif üyeler görebilir (içerik gizliliği). */
export function useClubMembers(clubId: string | undefined) {
  return useQuery<ClubMemberRow[]>({
    queryKey: ['clubs', 'members', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('profile_id, role, status, joined_at, profile:profiles(display_name, city)')
        .eq('club_id', clubId!)
        .eq('status', 'active')
        .order('role', { ascending: true });
      if (error) throw error;
      return z.array(memberRowSchema).parse(data ?? []);
    },
  });
}

export type Membership = { role: ClubRole; status: MemberStatus } | null;

/** Mevcut kullanıcının bu kulüpteki üyelik durumu (yok / pending / active). */
export function useMyMembership(clubId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery<Membership>({
    queryKey: ['clubs', 'membership', clubId, userId],
    enabled: !!clubId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('role, status')
        .eq('club_id', clubId!)
        .eq('profile_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ? { role: data.role as ClubRole, status: data.status as MemberStatus } : null;
    },
  });
}

function invalidateClub(queryClient: ReturnType<typeof useQueryClient>, clubId: string) {
  queryClient.invalidateQueries({ queryKey: ['clubs', 'membership', clubId] });
  queryClient.invalidateQueries({ queryKey: ['clubs', 'mine'] });
  queryClient.invalidateQueries({ queryKey: ['clubs', 'members', clubId] });
}

/** Kulübe katılma talebi (pending). Owner/admin onaylayınca aktif olur. */
export function useJoinClub(clubId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: clubId, profile_id: userId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => invalidateClub(queryClient, clubId),
  });
}

/** Kulüpten ayrıl (kendi üyeliğini sil). */
export function useLeaveClub(clubId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('profile_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateClub(queryClient, clubId),
  });
}

// === Üye yönetimi (owner/admin) ===

/** Bekleyen katılım talepleri. RLS: yalnızca aktif üye/admin görebilir. */
export function usePendingMembers(clubId: string | undefined) {
  return useQuery<ClubMemberRow[]>({
    queryKey: ['clubs', 'pending', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('profile_id, role, status, joined_at, profile:profiles(display_name, city)')
        .eq('club_id', clubId!)
        .eq('status', 'pending')
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return z.array(memberRowSchema).parse(data ?? []);
    },
  });
}

function invalidateManage(queryClient: ReturnType<typeof useQueryClient>, clubId: string) {
  queryClient.invalidateQueries({ queryKey: ['clubs', 'pending', clubId] });
  queryClient.invalidateQueries({ queryKey: ['clubs', 'members', clubId] });
  queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', clubId] });
}

/** Bekleyen üyeyi onayla (pending → active). Kapasite doluysa sunucu reddeder. */
export function useApproveMember(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('club_members')
        .update({ status: 'active' })
        .eq('club_id', clubId)
        .eq('profile_id', profileId);
      if (error) throw error;
    },
    onSuccess: () => invalidateManage(queryClient, clubId),
  });
}

/** Üyeyi çıkar / talebi reddet (satırı sil). */
export function useRemoveMember(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('profile_id', profileId);
      if (error) throw error;
    },
    onSuccess: () => invalidateManage(queryClient, clubId),
  });
}

/** Üye rolünü değiştir (member ↔ admin). owner rolü değiştirilmez. */
export function useSetMemberRole(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: 'admin' | 'member' }) => {
      const { error } = await supabase
        .from('club_members')
        .update({ role })
        .eq('club_id', clubId)
        .eq('profile_id', profileId);
      if (error) throw error;
    },
    onSuccess: () => invalidateManage(queryClient, clubId),
  });
}
