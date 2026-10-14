import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Pill, SectionTitle } from '@/components/ui';
import { MOTO_ICON } from '@/lib/icons';
import { useMyClubs } from '@/features/clubs/api';
import { useNearbyEvents } from '@/features/events/api';
import { useCurrentLocation } from '@/features/location/useCurrentLocation';
import { useProfile } from '@/features/profile/useProfile';
import { colors, font, radius, spacing } from '@/theme';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { location, loading: locLoading, denied } = useCurrentLocation();
  const { data: nearby, isLoading: nearbyLoading } = useNearbyEvents(location);
  const { data: clubs, isLoading: clubsLoading } = useMyClubs();

  const hasClubs = (clubs?.length ?? 0) > 0;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>
        Merhaba{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
      </Text>
      {profile?.city ? (
        <View style={styles.locRow}>
          <Ionicons name="location" size={14} color={colors.inkSoft} />
          <Text style={font.muted}>{profile.city}</Text>
        </View>
      ) : null}

      {clubsLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 48 }} />
      ) : !hasClubs ? (
        <EmptyState
          style={styles.hero}
          icon={MOTO_ICON}
          iconSet="material"
          title="Henüz bir kulübün yok"
          description="Yakınındaki motosiklet kulüplerine katıl; etkinlikler ve rotalar burada görünsün."
          primaryAction={{ label: 'Kulüpleri keşfet', onPress: () => router.push('/(tabs)/clubs') }}
          secondaryAction={{
            label: 'Yakındaki etkinliklere göz at',
            onPress: () => router.push('/(tabs)/events'),
          }}
        />
      ) : (
        <>
          <View style={styles.section}>
            <SectionTitle>Yakınımdaki etkinlikler</SectionTitle>
            {denied ? (
              <EmptyState
                icon="location-outline"
                title="Konum izni gerekli"
                description="Yakındaki etkinlikleri gösterebilmemiz için konum iznine ihtiyacımız var."
              />
            ) : locLoading || nearbyLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
            ) : (nearby?.length ?? 0) === 0 ? (
              <EmptyState
                icon="calendar"
                title="Yakında etkinlik yok"
                description="Şu an yakınında planlanmış bir etkinlik yok. Daha sonra tekrar bak."
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {nearby!.map((ev) => (
                  <Pressable key={ev.id} onPress={() => router.push(`/events/${ev.id}`)}>
                    <Card>
                      <Text style={styles.cardTitle}>{ev.title}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color={colors.inkSoft} />
                        <Text style={font.muted}>{fmt(ev.start_time)}</Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionTitle>Kulüplerim</SectionTitle>
            <View style={{ gap: spacing.md }}>
              {clubs!.map((m) => (
                <Pressable key={m.club.id} onPress={() => router.push(`/clubs/${m.club.id}`)}>
                  <Card>
                    <View style={styles.clubRow}>
                      <View style={styles.clubLogo}>
                        <Text style={{ fontSize: 18 }}>🏍️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{m.club.name}</Text>
                        <Text style={font.muted}>{m.club.city ?? '—'}</Text>
                      </View>
                      <Pill
                        label={
                          m.role === 'owner' ? 'Kurucu' : m.role === 'admin' ? 'Yönetici' : 'Üye'
                        }
                        tone={m.role === 'member' ? 'muted' : 'success'}
                      />
                    </View>
                    <View style={styles.chatHint}>
                      <Ionicons name="arrow-forward" size={14} color={colors.brand} />
                      <Text style={styles.chatHintText}>Kulübü aç</Text>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 40 },
  hero: { paddingVertical: 56 },
  greeting: { ...font.display, fontSize: 26 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -10 },
  section: { gap: spacing.sm },
  cardTitle: { ...font.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clubLogo: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatHintText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
});
