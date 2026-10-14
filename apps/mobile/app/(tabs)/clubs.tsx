import { Ionicons } from '@expo/vector-icons';
import type { Club } from '@motogroup/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, EmptyState, Pill } from '@/components/ui';
import { useDiscoverClubs, useMyClubs } from '@/features/clubs/api';
import { colors, font, radius, spacing } from '@/theme';

export default function ClubsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: myClubs } = useMyClubs();
  const { data: discovered, isLoading } = useDiscoverClubs(search);

  const myIds = new Set((myClubs ?? []).map((m) => m.club.id));

  // Keşfet listesi: aramada tüm eşleşmeler; varsayılan görünümde üye olunan kulüpleri
  // çıkar (aynı kulüp hem "Üyeliklerim"de hem keşfet'te görünmesin).
  const discoverList =
    search.length > 0 ? (discovered ?? []) : (discovered ?? []).filter((c) => !myIds.has(c.id));

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kulüp ara (ad veya şehir)…"
          placeholderTextColor={colors.inkFaint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
          </Pressable>
        ) : null}
      </View>

      {search.length === 0 && (myClubs?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <Text style={font.heading}>Üyeliklerim</Text>
          {myClubs!.map((m) => (
            <ClubCard
              key={m.club.id}
              club={m.club}
              roleLabel={m.role === 'owner' ? 'Kurucu' : m.role === 'admin' ? 'Yönetici' : 'Üye'}
              roleTone={m.role === 'member' ? 'muted' : 'success'}
              onPress={() => router.push(`/clubs/${m.club.id}`)}
            />
          ))}
        </View>
      ) : search.length === 0 && myClubs?.length === 0 ? (
        <EmptyState
          icon="people"
          title="Hiçbir kulübe katılmadın"
          description="Bir kulübe katıl, sürüşler ve etkinlikler burada toplansın."
        />
      ) : null}

      <View style={styles.section}>
        <Text style={font.heading}>
          {search.length > 0 ? 'Arama sonuçları' : 'Kulüpleri keşfet'}
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
        ) : discoverList.length === 0 ? (
          search.length > 0 ? (
            <EmptyState
              icon="search"
              title="Sonuç bulunamadı"
              description={`"${search}" için eşleşme yok. Farklı bir arama dene.`}
              secondaryAction={{ label: 'Aramayı temizle', onPress: () => setSearch('') }}
            />
          ) : (
            <EmptyState
              icon="people"
              title="Keşfedilecek yeni kulüp yok"
              description="Şu an katılabileceğin başka bir kulüp yok. Daha sonra tekrar bak."
            />
          )
        ) : (
          discoverList.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              roleLabel={myIds.has(club.id) ? 'Üyesin' : undefined}
              roleTone="success"
              onPress={() => router.push(`/clubs/${club.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ClubCard({
  club,
  roleLabel,
  roleTone,
  onPress,
}: {
  club: Club;
  roleLabel?: string;
  roleTone: 'success' | 'muted';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <View style={styles.logo}>
            <Text style={{ fontSize: 18 }}>🏍️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={font.heading}>{club.name}</Text>
            <Text style={font.muted}>
              {club.city ?? '—'}
              {club.moto_type ? ` · ${club.moto_type}` : ''} · {club.member_count} üye
            </Text>
          </View>
          {roleLabel ? (
            <Pill label={roleLabel} tone={roleTone} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40, gap: spacing.lg },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
