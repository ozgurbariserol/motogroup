import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { GeoPoint } from '@motogroup/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Button, Eyebrow, Field } from '@/components/ui';
import { useMyAdminClubs } from '@/features/clubs/api';
import { useCreateEvent } from '@/features/events/api';
import { colors, font, radius, spacing } from '@/theme';

const TURKEY_REGION = { latitude: 39.0, longitude: 35.0, latitudeDelta: 6, longitudeDelta: 6 };

/** "15 Temmuz 2026, Salı · 10:00" */
function formatTr(d: Date): string {
  const dm = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const wd = d.toLocaleDateString('tr-TR', { weekday: 'long' });
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `${dm}, ${wd} · ${time}`;
}

export default function NewEventScreen() {
  const router = useRouter();
  const { data: adminClubs, isLoading } = useMyAdminClubs();
  const createEvent = useCreateEvent();

  const [clubId, setClubId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<GeoPoint | null>(null);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!adminClubs || adminClubs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Etkinlik oluşturmak için bir kulübün yöneticisi olmalısın.</Text>
      </View>
    );
  }

  function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPoint({ lat: latitude, lng: longitude });
  }

  // Bir saat sonrasına yuvarlanmış varsayılan başlangıç.
  function defaultStart(): Date {
    const d = startAt ?? new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      const base = defaultStart();
      // Adım 1: tarih → Adım 2: saat
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (dateEvent, pickedDate) => {
          if (dateEvent.type !== 'set' || !pickedDate) return;
          DateTimePickerAndroid.open({
            value: base,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, pickedTime) => {
              if (timeEvent.type !== 'set' || !pickedTime) return;
              const final = new Date(pickedDate);
              final.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
              setStartAt(final);
            },
          });
        },
      });
    } else {
      setShowIosPicker(true);
    }
  }

  function onSubmit() {
    if (!clubId) return Alert.alert('Eksik', 'Bir kulüp seç.');
    if (title.trim().length < 1) return Alert.alert('Eksik', 'Başlık gir.');
    if (!startAt) return Alert.alert('Eksik', 'Başlangıç tarihi ve saati seç.');
    if (startAt.getTime() <= Date.now())
      return Alert.alert('Tarih hatalı', 'Geçmiş bir zaman seçemezsin.');
    const startIso = startAt.toISOString();

    createEvent.mutate(
      {
        club_id: clubId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startIso,
        meeting_location: point,
        meeting_address: address.trim() || undefined,
      },
      {
        onSuccess: (eventId) => router.replace(`/events/${eventId}`),
        onError: (err) =>
          Alert.alert('Oluşturulamadı', err instanceof Error ? err.message : 'Hata'),
      },
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Eyebrow>Yeni etkinlik</Eyebrow>
      <Text style={styles.title}>Etkinlik oluştur</Text>

      <Text style={styles.label}>Kulüp</Text>
      <View style={styles.chipRow}>
        {adminClubs.map((club) => {
          const selected = club.id === clubId;
          return (
            <Pressable
              key={club.id}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => setClubId(club.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{club.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <Field
          label="Başlık"
          value={title}
          onChangeText={setTitle}
          placeholder="örn. Pazar Sürüşü"
        />
        <Field
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Detaylar"
          multiline
        />
        <View>
          <Text style={styles.pickerLabel}>Başlangıç</Text>
          <Pressable style={styles.pickerField} onPress={openPicker}>
            <Text style={startAt ? styles.pickerValue : styles.pickerPlaceholder}>
              {startAt ? formatTr(startAt) : 'Tarih ve saat seç'}
            </Text>
          </Pressable>
          {showIosPicker ? (
            <View style={{ marginTop: spacing.sm }}>
              <DateTimePicker
                value={defaultStart()}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(_e, d) => {
                  if (d) setStartAt(d);
                }}
              />
              <Button
                label="Tamam"
                variant="ghost"
                onPress={() => setShowIosPicker(false)}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : null}
        </View>
        <Field
          label="Buluşma adresi"
          value={address}
          onChangeText={setAddress}
          placeholder="örn. Taksim Meydanı"
        />
      </View>

      <Text style={styles.label}>Buluşma noktası (haritaya dokun)</Text>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={TURKEY_REGION}
        onPress={onMapPress}
      >
        {point ? <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} /> : null}
      </MapView>
      <Text style={font.muted}>
        {point
          ? `Seçildi: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`
          : 'Henüz nokta seçilmedi (opsiyonel).'}
      </Text>

      <Button
        label="Oluştur"
        onPress={onSubmit}
        loading={createEvent.isPending}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: { ...font.display, fontSize: 24, marginTop: 4, marginBottom: spacing.md },
  label: { ...font.heading, fontSize: 14, marginTop: spacing.lg, marginBottom: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  map: { width: '100%', height: 220, borderRadius: radius.md, marginTop: 4 },
  pickerLabel: { ...font.caption, color: colors.ink, fontSize: 13.5, marginBottom: 6 },
  pickerField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerValue: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  pickerPlaceholder: { fontSize: 15, color: colors.inkFaint },
});
