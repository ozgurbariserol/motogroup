import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@motogroup/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Fab } from '@/components/ui';
import { useMyAdminClubs } from '@/features/clubs/api';
import { useUpcomingEvents } from '@/features/events/api';
import { colors, font, spacing } from '@/theme';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventsScreen() {
  const router = useRouter();
  const { data: events, isLoading, error } = useUpcomingEvents();
  const { data: adminClubs } = useMyAdminClubs();
  const canCreate = (adminClubs?.length ?? 0) > 0;

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
        <Text style={font.muted}>Etkinlikler yüklenemedi.</Text>
      </View>
    );
  }

  const hasEvents = (events?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            style={{ flex: 1 }}
            icon="calendar"
            title="Yaklaşan etkinlik yok"
            description="Kulübünde yeni bir buluşma planla ya da mevcut etkinliklere katıl."
            primaryAction={
              canCreate
                ? { label: 'Etkinlik oluştur', onPress: () => router.push('/events/new') }
                : undefined
            }
          />
        }
        renderItem={({ item }: { item: Event }) => (
          <Pressable onPress={() => router.push(`/events/${item.id}`)}>
            <Card>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={14} color={colors.inkSoft} />
                <Text style={font.muted}>{fmt(item.start_time)}</Text>
              </View>
              {item.meeting_address ? (
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={14} color={colors.inkSoft} />
                  <Text style={font.muted} numberOfLines={1}>
                    {item.meeting_address}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
      {canCreate && hasEvents ? (
        <Fab onPress={() => router.push('/events/new')} accessibilityLabel="Etkinlik oluştur" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { ...font.heading },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
});
