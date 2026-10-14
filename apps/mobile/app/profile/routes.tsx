import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Pill, SectionTitle } from '@/components/ui';
import { useMyFavoriteRoutes, useMyRoutes, type RouteLite } from '@/features/profile/api';
import { colors, font, radius, spacing } from '@/theme';

export default function MyRoutesScreen() {
  const router = useRouter();
  const { data: mine, isLoading } = useMyRoutes();
  const { data: favorites } = useMyFavoriteRoutes();

  function RouteItem({ r }: { r: RouteLite }) {
    return (
      <Pressable onPress={() => router.push(`/routes/${r.id}`)}>
        <Card>
          <View style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name="map" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={font.heading}>{r.title}</Text>
              <View style={styles.meta}>
                {r.distance_km != null ? <Text style={font.muted}>{r.distance_km} km</Text> : null}
                {r.difficulty ? <Pill label={r.difficulty} tone="muted" /> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/profile" style={styles.back}>
        ← Profil
      </Link>
      <Text style={styles.title}>Rotalarım</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <SectionTitle>Oluşturduklarım</SectionTitle>
          {(mine?.length ?? 0) === 0 ? (
            <EmptyState
              icon="map"
              title="Henüz rota oluşturmadın"
              description="İlk rotanı ekleyip diğer sürücülerle paylaş."
              primaryAction={{ label: 'Rota ekle', onPress: () => router.push('/routes/new') }}
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {mine!.map((r) => (
                <RouteItem key={r.id} r={r} />
              ))}
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <SectionTitle>Favorilerim</SectionTitle>
            {(favorites?.length ?? 0) === 0 ? (
              <EmptyState
                icon="star"
                title="Henüz favori rotan yok"
                description="Beğendiğin rotaları favorileyerek burada topla."
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {favorites!.map((r) => (
                  <RouteItem key={r.id} r={r} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
});
