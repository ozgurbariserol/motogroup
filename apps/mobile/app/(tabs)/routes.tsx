import { Ionicons } from '@expo/vector-icons';
import type { Route } from '@motogroup/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Fab, Pill } from '@/components/ui';
import { useRoutes } from '@/features/routes/api';
import { colors, font, spacing } from '@/theme';

export default function RoutesScreen() {
  const router = useRouter();
  const { data: routes, isLoading, error } = useRoutes();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Rotalar yüklenemedi.</Text>
      </View>
    );
  }

  const hasRoutes = (routes?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={routes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            style={{ flex: 1 }}
            icon="map"
            title="Henüz rota paylaşılmamış"
            description="İlk rotanı ekle, diğer sürücülerle paylaş."
            primaryAction={{ label: 'Rota ekle', onPress: () => router.push('/routes/new') }}
          />
        }
        renderItem={({ item }: { item: Route }) => (
          <Pressable onPress={() => router.push(`/routes/${item.id}`)}>
            <Card>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name="map" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={styles.meta}>
                    {item.distance_km != null ? (
                      <Text style={font.muted}>{item.distance_km} km</Text>
                    ) : null}
                    {item.difficulty ? <Pill label={item.difficulty} tone="muted" /> : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </View>
            </Card>
          </Pressable>
        )}
      />
      {hasRoutes ? (
        <Fab onPress={() => router.push('/routes/new')} accessibilityLabel="Rota ekle" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font.heading },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
});
