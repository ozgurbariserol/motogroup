import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { isOnboardingComplete, useProfile } from '@/features/profile/useProfile';

// Auth + onboarding durumuna göre kullanıcıyı doğru gruba yönlendirir.
function RouteGuard() {
  const { session, initializing } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const group = segments[0]; // '(auth)' | '(tabs)' | 'onboarding' | undefined
    const inAuthGroup = group === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // Oturum var; profil yüklenmesini bekle.
    if (profileLoading) return;

    if (!isOnboardingComplete(profile)) {
      if (group !== 'onboarding') router.replace('/onboarding');
      return;
    }

    // Giriş yapmış + onboarding tamam → uygulamaya.
    if (inAuthGroup || group === 'onboarding' || group === undefined) {
      router.replace('/(tabs)');
    }
  }, [initializing, session, profile, profileLoading, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouteGuard />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
