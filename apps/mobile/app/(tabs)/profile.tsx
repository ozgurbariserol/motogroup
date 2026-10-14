import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, MotoIcon } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { useProfile } from '@/features/profile/useProfile';
import { colors, font, radius, spacing } from '@/theme';

const MENU: { icon?: string; label: string; href: Href; moto?: boolean }[] = [
  { label: 'Motosikletlerim', href: '/profile/motorcycles', moto: true },
  { icon: 'people-outline', label: 'Kulüplerim', href: '/(tabs)/clubs' },
  { icon: 'calendar-outline', label: 'Etkinliklerim', href: '/profile/events' },
  { icon: 'map-outline', label: 'Rotalarım', href: '/profile/routes' },
];

export default function ProfileScreen() {
  const { data: profile } = useProfile();

  async function onSignOut() {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Çıkış başarısız', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  const router = useRouter();
  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '🏍️';

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{profile?.display_name ?? 'Profil'}</Text>
        {profile?.city ? (
          <View style={styles.locRow}>
            <Ionicons name="location" size={14} color={colors.inkSoft} />
            <Text style={font.muted}>{profile.city}</Text>
          </View>
        ) : null}
      </View>

      <Card>
        {MENU.map((item, i, arr) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href)}
            style={[styles.menuRow, i < arr.length - 1 && styles.menuDivider]}
          >
            {item.moto ? (
              <MotoIcon size={18} color={colors.brand} />
            ) : (
              <Ionicons name={item.icon as never} size={18} color={colors.brand} />
            )}
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </Pressable>
        ))}
      </Card>

      <Button
        label="Çıkış yap"
        variant="ghost"
        onPress={onSignOut}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: spacing.lg, gap: 6 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 30, fontWeight: '800' },
  name: { ...font.title, marginTop: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { ...font.body, fontWeight: '600', flex: 1 },
});
