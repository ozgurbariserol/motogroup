import { Ionicons } from '@expo/vector-icons';
import type { RsvpStatus } from '@motogroup/shared';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, Card, SectionTitle } from '@/components/ui';
import {
  useAddEventComment,
  useEvent,
  useEventComments,
  useMyRsvp,
  useSetRsvp,
} from '@/features/events/api';
import { openInMaps } from '@/lib/maps';
import { colors, font, radius, spacing } from '@/theme';

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'going', label: 'Katılıyorum' },
  { value: 'maybe', label: 'Belki' },
  { value: 'not_going', label: 'Katılmıyorum' },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { data: myRsvp } = useMyRsvp(id);
  const setRsvp = useSetRsvp(id ?? '');
  const { data: comments } = useEventComments(id);
  const addComment = useAddEventComment(id ?? '');
  const [commentText, setCommentText] = useState('');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={font.muted}>Etkinlik bulunamadı.</Text>
        <Link href="/(tabs)/events" style={styles.link}>
          Geri dön
        </Link>
      </View>
    );
  }

  const loc = event.meeting_location;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Link href="/(tabs)/events" style={styles.back}>
        ← Etkinlikler
      </Link>
      <Text style={styles.title}>{event.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={15} color={colors.inkSoft} />
        <Text style={font.muted}>{new Date(event.start_time).toLocaleString('tr-TR')}</Text>
      </View>

      <Pressable onPress={() => router.push(`/events/${event.id}/chat`)} style={styles.chatBtn}>
        <Ionicons name="chatbubble-ellipses" size={16} color={colors.brand} />
        <Text style={styles.chatBtnText}>Etkinlik sohbeti</Text>
      </Pressable>

      {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}

      {loc ? (
        <View style={styles.mapWrap}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            pointerEvents="none"
            initialRegion={{
              latitude: loc.lat,
              longitude: loc.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={event.title} />
          </MapView>
          {event.meeting_address ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color={colors.inkSoft} />
              <Text style={font.muted}>{event.meeting_address}</Text>
            </View>
          ) : null}
          <Button
            label="Google Maps'te aç"
            variant="brandSoft"
            onPress={() => openInMaps(loc, event.title)}
          />
        </View>
      ) : null}

      <SectionTitle>Katılım</SectionTitle>
      <View style={styles.rsvpRow}>
        {RSVP_OPTIONS.map((opt) => {
          const selected = myRsvp === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.rsvp, selected && styles.rsvpActive]}
              onPress={() => setRsvp.mutate(opt.value)}
              disabled={setRsvp.isPending}
            >
              <Text style={[styles.rsvpText, selected && styles.rsvpTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Yorumlar</SectionTitle>
      <CommentBox
        value={commentText}
        onChange={setCommentText}
        loading={addComment.isPending}
        onSend={() =>
          addComment.mutate(commentText.trim(), {
            onSuccess: () => setCommentText(''),
            onError: (err) =>
              Alert.alert('Gönderilemedi', err instanceof Error ? err.message : 'Hata'),
          })
        }
      />
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {(comments ?? []).map((c) => (
          <Card key={c.id} style={styles.comment}>
            <Text style={styles.commentAuthor}>{c.author?.display_name ?? 'Üye'}</Text>
            <Text style={font.body}>{c.content}</Text>
          </Card>
        ))}
        {(comments?.length ?? 0) === 0 ? <Text style={font.muted}>Henüz yorum yok.</Text> : null}
      </View>
    </ScrollView>
  );
}

function CommentBox({
  value,
  onChange,
  onSend,
  loading,
}: {
  value: string;
  onChange: (s: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  return (
    <View style={styles.commentRow}>
      <View style={{ flex: 1 }}>
        <CommentInput value={value} onChange={onChange} />
      </View>
      <Pressable
        style={styles.sendBtn}
        disabled={loading || value.trim().length === 0}
        onPress={onSend}
      >
        <Ionicons name="send" size={18} color={colors.white} />
      </Pressable>
    </View>
  );
}

function CommentInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <TextInput
      style={styles.commentInput}
      placeholder="Yorum yaz…"
      placeholderTextColor={colors.inkFaint}
      value={value}
      onChangeText={onChange}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
  },
  back: { color: colors.inkSoft, fontWeight: '600' },
  link: { color: colors.brand, fontWeight: '700' },
  title: { ...font.display, fontSize: 26, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandTint,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  chatBtnText: { color: colors.brand, fontWeight: '700' },
  desc: { ...font.body, lineHeight: 22, marginTop: spacing.sm },
  mapWrap: { gap: spacing.sm, marginTop: spacing.md },
  map: { width: '100%', height: 180, borderRadius: radius.md },
  rsvpRow: { flexDirection: 'row', gap: spacing.sm },
  rsvp: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  rsvpActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  rsvpText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  rsvpTextActive: { color: colors.white },
  commentRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  commentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comment: { padding: spacing.md },
  commentAuthor: { fontWeight: '700', marginBottom: 2, color: colors.ink },
});
