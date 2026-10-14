import { Ionicons } from '@expo/vector-icons';
import { motorcycleCreateSchema } from '@motogroup/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, EmptyState, Field, MotoIcon, Pill } from '@/components/ui';
import { MOTO_ICON } from '@/lib/icons';
import { useAddMotorcycle, useDeleteMotorcycle, useMyMotorcycles } from '@/features/profile/api';
import { colors, font, radius, spacing } from '@/theme';

export default function MotorcyclesScreen() {
  const { data: bikes, isLoading } = useMyMotorcycles();
  const add = useAddMotorcycle();
  const del = useDeleteMotorcycle();

  const [showForm, setShowForm] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [cc, setCc] = useState('');

  function onAdd() {
    const parsed = motorcycleCreateSchema.safeParse({
      brand,
      model,
      year: year ? Number(year) : undefined,
      cc: cc ? Number(cc) : undefined,
      is_primary: (bikes?.length ?? 0) === 0,
    });
    if (!parsed.success) {
      Alert.alert('Eksik bilgi', parsed.error.issues[0]?.message ?? 'Marka ve model gir.');
      return;
    }
    add.mutate(parsed.data, {
      onSuccess: () => {
        setBrand('');
        setModel('');
        setYear('');
        setCc('');
        setShowForm(false);
      },
      onError: (err) => Alert.alert('Eklenemedi', err instanceof Error ? err.message : 'Hata'),
    });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/profile" style={styles.back}>
        ← Profil
      </Link>
      <Text style={styles.title}>Motosikletlerim</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
      ) : (bikes?.length ?? 0) === 0 && !showForm ? (
        <EmptyState
          icon={MOTO_ICON}
          iconSet="material"
          title="Henüz motosiklet eklemedin"
          description="İlk motorunu ekle; profilinde ve kulüplerde görünsün."
          primaryAction={{ label: 'Motosiklet ekle', onPress: () => setShowForm(true) }}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(bikes ?? []).map((b) => (
            <Card key={b.id}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <MotoIcon size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={font.heading}>
                    {b.brand} {b.model}
                  </Text>
                  <Text style={font.muted}>
                    {[b.year, b.cc ? `${b.cc}cc` : null].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                {b.is_primary ? <Pill label="Birincil" tone="success" /> : null}
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Sil', `${b.brand} ${b.model} silinsin mi?`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(b.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={colors.inkFaint} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      {showForm ? (
        <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Text style={font.heading}>Yeni motosiklet</Text>
          <Field label="Marka" placeholder="örn. Honda" value={brand} onChangeText={setBrand} />
          <Field
            label="Model"
            placeholder="örn. Africa Twin"
            value={model}
            onChangeText={setModel}
          />
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="Yıl"
                placeholder="2022"
                keyboardType="number-pad"
                value={year}
                onChangeText={setYear}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Motor (cc)"
                placeholder="1000"
                keyboardType="number-pad"
                value={cc}
                onChangeText={setCc}
              />
            </View>
          </View>
          <Button label="Ekle" onPress={onAdd} loading={add.isPending} />
          <Button label="Vazgeç" variant="ghost" onPress={() => setShowForm(false)} />
        </Card>
      ) : (bikes?.length ?? 0) > 0 ? (
        <Button
          label="+ Motosiklet ekle"
          variant="brandSoft"
          onPress={() => setShowForm(true)}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48 },
  back: { color: colors.inkSoft, fontWeight: '600' },
  title: { ...font.display, fontSize: 24, marginTop: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRow: { flexDirection: 'row', gap: spacing.md },
});
