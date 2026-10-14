import { profileSchema, type Profile } from '@motogroup/shared';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * Mevcut kullanıcının profilini getirir. Profil satırı auth.users insert trigger'ı
 * ile oluşur; onboarding tamamlanınca city/motosiklet dolar.
 */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery<Profile | null>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, city, avatar_url, created_at')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ? profileSchema.parse(data) : null;
    },
  });
}

/** Onboarding tamam mı? Şehir seçildiyse (ve en az 1 motor) tamamlanmış sayılır. */
export function isOnboardingComplete(profile: Profile | null | undefined): boolean {
  return !!profile?.city;
}
