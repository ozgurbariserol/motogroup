import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import {
  useAddRouteComment,
  useIsFavorite,
  useRoute,
  useRouteComments,
  useRouteGpxPoints,
  useToggleFavorite,
} from '@/features/routes/api';
import { openInMaps } from '@/lib/maps';
import { colors, font, radius, spacing } from '@/theme';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: route, isLoading } = useRoute(id);
  const { data: gpxPoints } = useRouteGpxPoints(route?.gpx_url);
  const { data: isFavorite } = useIsFavorite(id);
  const toggleFavorite = useToggleFavorite(id ?? '');
  const { data: comments } = useRouteComments(id);
  const addComment = useAddRouteComment(id ?? '');
  const [commentText, setCommentText] = useState('');
  const mapRef = useRef<MapView>(null);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!route) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Rota bulunamadı.</Text>
        <Link href="/(tabs)/routes" style={styles.link}>
          Geri dön
        </Link>
      </View>
    );
  }

  const start = route.start_location;
  const coords = (gpxPoints ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  // Marker: başlangıç noktası ya da (yoksa) GPX'in ilk noktası. Hiçbiri yoksa harita gösterilmez.
  const markerCoord = start ? { latitude: start.lat, longitude: start.lng } : (coords[0] ?? null);
  const hasGeo = markerCoord != null;

  function onMapReady() {
    if (coords.length > 1) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      });
    } else if (markerCoord) {
      mapRef.current?.animateToRegion(
        { ...markerCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        0,
      );
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/routes" style={styles.back}>
        ← Rotalar
      </Link>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{route.title}</Text>
        <Pressable
          onPress={() => toggleFavorite.mutate(!isFavorite)}
          disabled={toggleFavorite.isPending}
          hitSlop={10}
        >
          <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={28} color={colors.brand} />
        </Pressable>
      </View>
      <View style={styles.metaRow}>
        {route.distance_km != null ? <Text style={styles.stat}>{route.distance_km} km</Text> : null}
        {route.difficulty ? <Pill label={route.difficulty} tone="muted" /> : null}
        {route.moto_type ? <Text style={font.muted}>{route.moto_type}</Text> : null}
      </View>

      {route.description ? <Text style={styles.desc}>{route.description}</Text> : null}

      {hasGeo ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            onMapReady={onMapReady}
            initialRegion={{
              latitude: markerCoord!.latitude,
              longitude: markerCoord!.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={markerCoord!} title="Başlangıç" />
            {coords.length > 1 ? (
              <Polyline coordinates={coords} strokeColor={colors.brand} strokeWidth={4} />
            ) : null}
          </MapView>
          {start ? (
            <Button
              label="Başlangıcı Google Maps'te aç"
              variant="brandSoft"
              onPress={() => openInMaps(start, route.title)}
            />
          ) : null}
        </View>
      ) : (
        <Card style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={22} color={colors.inkFaint} />
          <Text style={font.muted}>Bu rota için harita önizlemesi yok.</Text>
        </Card>
      )}

      <SectionTitle>Yorumlar</SectionTitle>
      <View style={styles.commentRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Yorum yaz…"
          placeholderTextColor={colors.inkFaint}
          value={commentText}
          onChangeText={setCommentText}
        />
        <Pressable
          style={styles.sendBtn}
          disabled={addComment.isPending || commentText.trim().length === 0}
          onPress={() =>
            addComment.mutate(commentText.trim(), {
              onSuccess: () => setCommentText(''),
              onError: (err) =>
                Alert.alert('Gönderilemedi', err instanceof Error ? err.message : 'Hata'),
            })
          }
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {(comments ?? []).map((c) => (
          <Card key={c.id} style={styles.comment}>
            <Text style={styles.commentAuthor}>{c.author?.display_name ?? 'Üye'}</Text>
            <Text style={font.body}>{c.content}</Text>
          </Card>
        ))}
        {(comments?.length ?? 0) === 0 ? <Text style={font.muted}>Henüz yorum yok.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
  },
  back: { color: colors.inkSoft, fontWeight: '600' },
  link: { color: colors.brand, fontWeight: '700' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  title: { ...font.display, fontSize: 26, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stat: { ...font.heading, color: colors.brand },
  desc: { ...font.body, lineHeight: 22, marginTop: spacing.sm },
  mapWrap: { gap: spacing.sm, marginTop: spacing.md },
  map: { width: '100%', height: 220, borderRadius: radius.md },
  mapPlaceholder: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comment: { padding: spacing.md },
  commentAuthor: { fontWeight: '700', marginBottom: 2, color: colors.ink },
});
