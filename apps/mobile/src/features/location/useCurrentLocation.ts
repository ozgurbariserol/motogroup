import type { GeoPoint } from '@motogroup/shared';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

type LocationState = {
  location: GeoPoint | null;
  loading: boolean;
  denied: boolean;
};

/** Tek seferlik mevcut konum (yakınımdaki etkinlikler için). İzin reddedilirse denied=true. */
export function useCurrentLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: true,
    denied: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setState({ location: null, loading: false, denied: true });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          loading: false,
          denied: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
