import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Pill } from '@/components/ui';
import { useMyEvents } from '@/features/profile/api';
import { colors, font, spacing } from '@/theme';

const statusLabel: Record<string, { label: string; tone: 'success' | 'muted' | 'warning' }> = {
  going: { label: 'Katılıyorum', tone: 'success' },
  maybe: { label: 'Belki', tone: 'warning' },
  not_going: { label: 'Katılmıyorum', tone: 'muted' },
};

export default function MyEventsScreen() {
  const router = useRouter();
  const { data: events, isLoading } = useMyEvents();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/profile" style={styles.back}>
        ← Profil
      </Link>
      <Text style={styles.title}>Etkinliklerim</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
      ) : (events?.length ?? 0) === 0 ? (
        <EmptyState
          icon="calendar"
          title="Henüz etkinliğe katılmadın"
          description="RSVP verdiğin etkinlikler burada listelenir."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(events ?? [])
            .filter((e) => e.event)
            .map((e) => (
              <Pressable key={e.event!.id} onPress={() => router.push(`/events/${e.event!.id}`)}>
                <Card>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={font.heading}>{e.event!.title}</Text>
                      <Text style={font.muted}>
                        {new Date(e.event!.start_time).toLocaleString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Pill
                      label={statusLabel[e.status]?.label ?? e.status}
                      tone={statusLabel[e.status]?.tone ?? 'muted'}
                    />
                  </View>
                </Card>
              </Pressable>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48 },
  back: { color: colors.inkSoft, fontWeight: '600' },
  title: { ...font.display, fontSize: 24, marginTop: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
