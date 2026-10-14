import { motorcycleCreateSchema } from '@motogroup/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { BrandMark, Button, Eyebrow, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/theme';

const onboardingSchema = z.object({
  city: z.string().trim().min(2, 'Şehir girin'),
  motorcycle: motorcycleCreateSchema,
});

export default function OnboardingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [city, setCity] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [cc, setCc] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Oturum bulunamadı');

      const parsed = onboardingSchema.parse({
        city,
        motorcycle: {
          brand,
          model,
          year: year ? Number(year) : undefined,
          cc: cc ? Number(cc) : undefined,
          is_primary: true,
        },
      });

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ city: parsed.city })
        .eq('id', userId);
      if (profileError) throw profileError;

      const { error: motoError } = await supabase.from('motorcycles').insert({
        profile_id: userId,
        ...parsed.motorcycle,
      });
      if (motoError) throw motoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      Alert.alert('Kaydedilemedi', err instanceof Error ? err.message : 'Formu kontrol edin');
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BrandMark size={52} />
      <Eyebrow>Hoş geldin</Eyebrow>
      <Text style={styles.title}>Seni tanıyalım</Text>
      <Text style={[font.muted, { marginBottom: spacing.lg }]}>
        Şehrin ve motorunla profilini tamamla.
      </Text>

      <View style={styles.group}>
        <Field label="Şehir" placeholder="örn. İstanbul" value={city} onChangeText={setCity} />
      </View>

      <Text style={styles.groupLabel}>Motosiklet</Text>
      <View style={styles.group}>
        <Field label="Marka" placeholder="örn. Honda" value={brand} onChangeText={setBrand} />
        <Field label="Model" placeholder="örn. Africa Twin" value={model} onChangeText={setModel} />
        <View style={styles.row}>
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
      </View>

      <Button
        label="Devam et →"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: 72, backgroundColor: colors.bg, flexGrow: 1 },
  title: { ...font.display, marginTop: 6 },
  groupLabel: { ...font.heading, marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
