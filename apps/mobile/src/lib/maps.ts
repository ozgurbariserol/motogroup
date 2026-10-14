import { Linking, Platform } from 'react-native';
import type { GeoPoint } from '@motogroup/shared';

// CLAUDE.md Bölüm 1: kendi navigasyonumuzu YAPMAYIZ — kullanıcıyı Google Maps'e devrederiz.
// Buluşma noktasını harici harita uygulamasında açar (native handoff).
export async function openInMaps(point: GeoPoint, label?: string): Promise<void> {
  const { lat, lng } = point;
  const encodedLabel = label ? encodeURIComponent(label) : undefined;

  // iOS'ta Apple Maps'e düşmek yerine Google Maps web/uygulama URL'i tüm platformlarda çalışır.
  const url =
    Platform.OS === 'ios'
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `geo:${lat},${lng}${encodedLabel ? `?q=${lat},${lng}(${encodedLabel})` : ''}`;

  const fallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : fallback);
  } catch {
    await Linking.openURL(fallback);
  }
}
