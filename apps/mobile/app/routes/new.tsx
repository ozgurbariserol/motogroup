import type { GeoPoint, RouteDifficulty } from '@motogroup/shared';
import { routeDifficultySchema } from '@motogroup/shared';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Button, Eyebrow, Field } from '@/components/ui';
import { useCreateRoute } from '@/features/routes/api';
import { buildGpx, parseGpxPoints, totalDistanceKm } from '@/lib/gpx';
import { colors, font, radius, spacing } from '@/theme';

const TURKEY_REGION = { latitude: 39.0, longitude: 35.0, latitudeDelta: 6, longitudeDelta: 6 };
const DIFFICULTIES = routeDifficultySchema.options;
type Mode = 'draw' | 'upload';

export default function NewRouteScreen() {
  const router = useRouter();
  const createRoute = useCreateRoute();

  const [mode, setMode] = useState<Mode>('draw');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<RouteDifficulty | null>(null);
  const [motoType, setMotoType] = useState('');
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [uploadedGpx, setUploadedGpx] = useState<string | null>(null);

  function onMapPress(e: MapPressEvent) {
    if (mode !== 'draw') return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPoints((prev) => [...prev, { lat: latitude, lng: longitude }]);
  }

  async function pickGpx() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/gpx+xml', 'application/xml', 'text/xml', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    try {
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = parseGpxPoints(text);
      if (parsed.length === 0)
        return Alert.alert('Geçersiz GPX', 'Dosyada konum noktası bulunamadı.');
      setUploadedGpx(text);
      setPoints(parsed);
    } catch (err) {
      Alert.alert('Okunamadı', err instanceof Error ? err.message : 'GPX okunamadı');
    }
  }

  function onSubmit() {
    if (title.trim().length < 1) return Alert.alert('Eksik', 'Başlık gir.');
    if (points.length === 0)
      return Alert.alert(
        'Eksik',
        mode === 'draw' ? 'Haritaya dokunarak rota çiz.' : 'Bir GPX dosyası seç.',
      );
    const gpxString =
      mode === 'upload' && uploadedGpx ? uploadedGpx : buildGpx(points, title.trim());
    createRoute.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty: difficulty ?? undefined,
        moto_type: motoType.trim() || undefined,
        points,
        gpxString,
      },
      {
        onSuccess: (routeId) => router.replace(`/routes/${routeId}`),
        onError: (err) =>
          Alert.alert('Oluşturulamadı', err instanceof Error ? err.message : 'Hata'),
      },
    );
  }

  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Eyebrow>Yeni rota</Eyebrow>
      <Text style={styles.title}>Rota ekle</Text>

      <View style={styles.segment}>
        {(['draw', 'upload'] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.segBtn, mode === m && styles.segActive]}
            onPress={() => {
              setMode(m);
              setPoints([]);
              setUploadedGpx(null);
            }}
          >
            <Text style={[styles.segText, mode === m && styles.segTextActive]}>
              {m === 'draw' ? 'Haritadan çiz' : 'GPX yükle'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        <Field label="Başlık" value={title} onChangeText={setTitle} placeholder="örn. Şile Turu" />
        <Field
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Detaylar"
          multiline
        />
      </View>

      <Text style={styles.label}>Zorluk</Text>
      <View style={styles.chipRow}>
        {DIFFICULTIES.map((d) => (
          <Pressable
            key={d}
            style={[styles.chip, difficulty === d && styles.chipActive]}
            onPress={() => setDifficulty(d)}
          >
            <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Field
          label="Motor tipi"
          placeholder="adventure / touring…"
          value={motoType}
          onChangeText={setMotoType}
        />
      </View>

      {mode === 'upload' ? (
        <Button
          label={uploadedGpx ? `GPX seçildi (${points.length} nokta)` : 'GPX dosyası seç'}
          variant="brandSoft"
          onPress={pickGpx}
          style={{ marginTop: spacing.lg }}
        />
      ) : (
        <>
          <Text style={styles.label}>Haritaya dokunarak rota çiz</Text>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={TURKEY_REGION}
            onPress={onMapPress}
          >
            {coords.map((c, i) => (
              <Marker key={i} coordinate={c} />
            ))}
            {coords.length > 1 ? (
              <Polyline coordinates={coords} strokeColor={colors.brand} strokeWidth={4} />
            ) : null}
          </MapView>
          <View style={styles.drawControls}>
            <Text style={font.muted}>
              {points.length} nokta · {totalDistanceKm(points)} km
            </Text>
            <Pressable
              onPress={() => setPoints((p) => p.slice(0, -1))}
              disabled={points.length === 0}
            >
              <Text style={styles.undo}>Son noktayı sil</Text>
            </Pressable>
          </View>
        </>
      )}

      <Button
        label="Kaydet"
        onPress={onSubmit}
        loading={createRoute.isPending}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48 },
  title: { ...font.display, fontSize: 24, marginTop: 4, marginBottom: spacing.md },
  label: { ...font.heading, fontSize: 14, marginTop: spacing.lg, marginBottom: spacing.sm },
  form: { gap: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F3',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  segActive: {
    backgroundColor: colors.surface,
    ...{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  },
  segText: { color: colors.inkSoft, fontWeight: '700' },
  segTextActive: { color: colors.ink },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  map: { width: '100%', height: 260, borderRadius: radius.md, marginTop: 4 },
  drawControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  undo: { color: colors.danger, fontWeight: '700' },
});
