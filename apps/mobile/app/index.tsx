import { Redirect } from 'expo-router';

// Giriş noktası — gerçek yönlendirme kök _layout'taki RouteGuard'da yapılır.
// Burada sekmelere yönlendiriyoruz; oturum yoksa guard sign-in'e geri alır.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
