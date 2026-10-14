import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import {
  useClub,
  useClubMembers,
  useJoinClub,
  useLeaveClub,
  useMyMembership,
} from '@/features/clubs/api';
import { useClubEvents } from '@/features/events/api';
import { colors, font, radius, spacing } from '@/theme';

const roleLabel = (r: string) => (r === 'owner' ? 'Kurucu' : r === 'admin' ? 'Yönetici' : 'Üye');

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: club, isLoading } = useClub(id);
  const { data: membership } = useMyMembership(id);
  const { data: members } = useClubMembers(id);
  const { data: events } = useClubEvents(id);
  const join = useJoinClub(id ?? '');
  const leave = useLeaveClub(id ?? '');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!club) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Kulüp bulunamadı.</Text>
        <Link href="/(tabs)/clubs" style={styles.link}>
          Geri dön
        </Link>
      </View>
    );
  }

  const isActive = membership?.status === 'active';
  const isOwner = membership?.role === 'owner';
  const isPending = membership?.status === 'pending';
  const full = club.member_count >= club.capacity && club.capacity > 0;

  function onLeave() {
    Alert.alert('Kulüpten ayrıl', `${club!.name} kulübünden ayrılmak istediğine emin misin?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayrıl', style: 'destructive', onPress: () => leave.mutate() },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/clubs" style={styles.back}>
        ← Kulüpler
      </Link>

      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={{ fontSize: 30 }}>🏍️</Text>
        </View>
        <Text style={styles.title}>{club.name}</Text>
        <Text style={font.muted}>
          {club.city ?? 'Şehir belirtilmemiş'}
          {club.moto_type ? ` · ${club.moto_type}` : ''}
        </Text>
        <View style={styles.statsRow}>
          <Pill label={`${club.member_count} / ${club.capacity} üye`} tone="muted" />
          {isActive ? (
            <Pill
              label={roleLabel(membership!.role)}
              tone={isOwner || membership!.role === 'admin' ? 'success' : 'muted'}
            />
          ) : null}
        </View>
      </View>

      {club.description ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={font.body}>{club.description}</Text>
        </Card>
      ) : null}

      {/* Aksiyon: üyelik durumuna göre */}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {!membership &&
          (full ? (
            <Card style={styles.notice}>
              <Text style={font.muted}>
                Bu kulüp şu an kapasitesini doldurmuş. Daha sonra tekrar dene.
              </Text>
            </Card>
          ) : (
            <Button label="Kulübe katıl" loading={join.isPending} onPress={() => join.mutate()} />
          ))}
        {isPending && (
          <>
            <Card style={styles.notice}>
              <Text style={{ ...font.body, color: colors.warning, fontWeight: '600' }}>
                Katılım talebin onay bekliyor.
              </Text>
            </Card>
            <Button
              label="Talebi geri çek"
              variant="ghost"
              loading={leave.isPending}
              onPress={() => leave.mutate()}
            />
          </>
        )}
        {isActive && (
          <>
            <Button label="💬 Sohbete gir" onPress={() => router.push(`/clubs/${club.id}/chat`)} />
            {membership?.role === 'owner' || membership?.role === 'admin' ? (
              <Button
                label="Üyeleri yönet"
                variant="brandSoft"
                onPress={() => router.push(`/clubs/${club.id}/manage`)}
              />
            ) : null}
            {!isOwner ? (
              <Button
                label="Kulüpten ayrıl"
                variant="ghost"
                loading={leave.isPending}
                onPress={onLeave}
              />
            ) : null}
          </>
        )}
      </View>

      {/* Üye-only içerik */}
      {isActive ? (
        <>
          <View style={{ marginTop: spacing.xl }}>
            <SectionTitle>Yaklaşan etkinlikler</SectionTitle>
            {(events?.length ?? 0) === 0 ? (
              <Text style={font.muted}>Yaklaşan etkinlik yok.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {events!.slice(0, 5).map((ev) => (
                  <Pressable key={ev.id} onPress={() => router.push(`/events/${ev.id}`)}>
                    <Card>
                      <Text style={font.heading}>{ev.title}</Text>
                      <Text style={font.muted}>
                        {new Date(ev.start_time).toLocaleString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <SectionTitle>Üyeler ({members?.length ?? 0})</SectionTitle>
            <Card style={{ paddingVertical: spacing.xs }}>
              {(members ?? []).map((m, i, arr) => (
                <View
                  key={m.profile_id}
                  style={[styles.memberRow, i < arr.length - 1 && styles.memberDivider]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {m.profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...font.body, fontWeight: '600' }}>
                      {m.profile?.display_name ?? 'Üye'}
                    </Text>
                    {m.profile?.city ? <Text style={font.caption}>{m.profile.city}</Text> : null}
                  </View>
                  {m.role !== 'member' ? <Pill label={roleLabel(m.role)} tone="success" /> : null}
                </View>
              ))}
            </Card>
          </View>
        </>
      ) : (
        <Card style={{ marginTop: spacing.xl }}>
          <Text style={font.muted}>
            Üye listesi, etkinlikler ve sohbet yalnızca kulüp üyelerine açıktır.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
  },
  back: { color: colors.inkSoft, fontWeight: '600' },
  link: { color: colors.brand, fontWeight: '700' },
  hero: { alignItems: 'center', marginTop: spacing.md, gap: 4 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { ...font.display, fontSize: 24, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  notice: { backgroundColor: colors.surface, padding: spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xs,
  },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
