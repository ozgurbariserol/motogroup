import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, EmptyState, Pill, SectionTitle } from '@/components/ui';
import {
  useApproveMember,
  useClubMembers,
  useMyMembership,
  usePendingMembers,
  useRemoveMember,
  useSetMemberRole,
  type ClubMemberRow,
} from '@/features/clubs/api';
import { useAuth } from '@/lib/auth';
import { colors, font, radius, spacing } from '@/theme';

const roleLabel = (r: string) => (r === 'owner' ? 'Kurucu' : r === 'admin' ? 'Yönetici' : 'Üye');

export default function ClubManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;
  const { data: membership, isLoading } = useMyMembership(id);
  const { data: pending } = usePendingMembers(id);
  const { data: members } = useClubMembers(id);
  const approve = useApproveMember(id ?? '');
  const remove = useRemoveMember(id ?? '');
  const setRole = useSetMemberRole(id ?? '');

  const isAdmin =
    membership?.status === 'active' && (membership.role === 'owner' || membership.role === 'admin');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Bu sayfa yalnızca kulüp yöneticilerine açıktır.</Text>
        <Link href={`/clubs/${id}`} style={styles.link}>
          Geri dön
        </Link>
      </View>
    );
  }

  function err(e: unknown) {
    Alert.alert('İşlem başarısız', e instanceof Error ? e.message : 'Hata');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href={`/clubs/${id}`} style={styles.back}>
        ← Kulüp
      </Link>
      <Text style={styles.title}>Üye yönetimi</Text>

      <SectionTitle>Bekleyen talepler ({pending?.length ?? 0})</SectionTitle>
      {(pending?.length ?? 0) === 0 ? (
        <EmptyState
          icon="checkmark-circle"
          title="Bekleyen talep yok"
          description="Yeni katılım talepleri burada görünür."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {pending!.map((m) => (
            <Card key={m.profile_id}>
              <View style={styles.row}>
                <Avatar name={m.profile?.display_name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.profile?.display_name ?? 'Üye'}</Text>
                  {m.profile?.city ? <Text style={font.caption}>{m.profile.city}</Text> : null}
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.approve]}
                  disabled={approve.isPending}
                  onPress={() => approve.mutate(m.profile_id, { onError: err })}
                >
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                  <Text style={styles.approveText}>Onayla</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.reject]}
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(m.profile_id, { onError: err })}
                >
                  <Ionicons name="close" size={16} color={colors.danger} />
                  <Text style={styles.rejectText}>Reddet</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.xl }}>
        <SectionTitle>Üyeler ({members?.length ?? 0})</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {(members ?? []).map((m) => (
            <MemberRow
              key={m.profile_id}
              member={m}
              isSelf={m.profile_id === myId}
              onPromote={() =>
                setRole.mutate({ profileId: m.profile_id, role: 'admin' }, { onError: err })
              }
              onDemote={() =>
                setRole.mutate({ profileId: m.profile_id, role: 'member' }, { onError: err })
              }
              onRemove={() =>
                Alert.alert(
                  'Üyeyi çıkar',
                  `${m.profile?.display_name ?? 'Üye'} kulüpten çıkarılsın mı?`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Çıkar',
                      style: 'destructive',
                      onPress: () => remove.mutate(m.profile_id, { onError: err }),
                    },
                  ],
                )
              }
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MemberRow({
  member,
  isSelf,
  onPromote,
  onDemote,
  onRemove,
}: {
  member: ClubMemberRow;
  isSelf: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
}) {
  const isOwner = member.role === 'owner';
  const isMember = member.role === 'member';
  return (
    <Card>
      <View style={styles.row}>
        <Avatar name={member.profile?.display_name} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {member.profile?.display_name ?? 'Üye'}
            {isSelf ? ' (sen)' : ''}
          </Text>
          <Text style={font.caption}>{roleLabel(member.role)}</Text>
        </View>
        {!isOwner ? (
          <Pill label={roleLabel(member.role)} tone={isMember ? 'muted' : 'success'} />
        ) : (
          <Pill label="Kurucu" tone="success" />
        )}
      </View>
      {!isOwner && !isSelf ? (
        <View style={styles.actions}>
          {isMember ? (
            <Pressable style={[styles.btn, styles.ghost]} onPress={onPromote}>
              <Ionicons name="arrow-up" size={15} color={colors.brand} />
              <Text style={styles.ghostText}>Yönetici yap</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.btn, styles.ghost]} onPress={onDemote}>
              <Ionicons name="arrow-down" size={15} color={colors.brand} />
              <Text style={styles.ghostText}>Üyeliğe al</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.reject]} onPress={onRemove}>
            <Ionicons name="person-remove" size={15} color={colors.danger} />
            <Text style={styles.rejectText}>Çıkar</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function Avatar({ name }: { name?: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
    </View>
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
  title: { ...font.display, fontSize: 24, marginTop: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...font.body, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  approve: { backgroundColor: colors.success },
  approveText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
  reject: { backgroundColor: '#FDECEC' },
  rejectText: { color: colors.danger, fontWeight: '700', fontSize: 13.5 },
  ghost: { backgroundColor: colors.brandTint },
  ghostText: { color: colors.brand, fontWeight: '700', fontSize: 13.5 },
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
