import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';
import {
  useMessages,
  useRealtimeMessages,
  useSendMessage,
  type ChatMessage,
  type ChatTarget,
} from './api';

export function Chat({ target }: { target: ChatTarget }) {
  const { session } = useAuth();
  const myId = session?.user.id;
  const { data: messages, isLoading } = useMessages(target);
  const sendMessage = useSendMessage(target);
  useRealtimeMessages(target);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  function onSend() {
    const content = text.trim();
    if (content.length === 0) return;
    setText('');
    sendMessage.mutate(content, {
      onError: (err) => {
        setText(content); // başarısızsa metni geri koy
        Alert.alert('Gönderilemedi', err instanceof Error ? err.message : 'Hata');
      },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <EmptyState
            style={styles.emptyChat}
            icon="chatbubbles"
            title="Sohbet henüz başlamadı"
            description="İlk mesajı sen yaz, konuşmayı başlat."
          />
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          return (
            <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                {!mine ? (
                  <Text style={styles.author}>{item.author?.display_name ?? 'Üye'}</Text>
                ) : null}
                <Text style={mine ? styles.textMine : styles.textOther}>{item.content}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mesaj yaz…"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={onSend}
          disabled={sendMessage.isPending || text.trim().length === 0}
        >
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: 12, gap: 8, flexGrow: 1 },
  emptyChat: { flex: 1 },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  author: { fontSize: 12, fontWeight: '700', color: colors.brand, marginBottom: 2 },
  textMine: { color: colors.white, fontSize: 15 },
  textOther: { color: colors.ink, fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxHeight: 120,
    backgroundColor: colors.bg,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    paddingHorizontal: 18,
    justifyContent: 'center',
    height: 44,
  },
  sendButtonText: { color: colors.white, fontWeight: '700' },
});
