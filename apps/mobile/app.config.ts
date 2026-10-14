import type { ExpoConfig } from 'expo/config';

// app.config.ts — Google Maps anahtarını EXPO_PUBLIC_GOOGLE_MAPS_KEY'den native config'e
// enjekte eder (statik app.json env okuyamaz). Anahtar zaten public (client) bir değerdir.
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

const config: ExpoConfig = {
  name: 'MotoGroup',
  slug: 'motogroup',
  version: '0.0.0',
  scheme: 'motogroup',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.motogroup.app',
    config: googleMapsKey ? { googleMapsApiKey: googleMapsKey } : undefined,
  },
  android: {
    package: 'com.motogroup.app',
    config: googleMapsKey ? { googleMaps: { apiKey: googleMapsKey } } : undefined,
  },
  plugins: [
    'expo-router',
    '@react-native-community/datetimepicker',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Yakınındaki etkinlik ve kulüpleri göstermek için konumunu kullanırız.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
