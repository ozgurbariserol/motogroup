import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Eyebrow, Field } from '@/components/ui';
import { signUpWithEmail } from '@/lib/auth';
import { colors, font, spacing } from '@/theme';

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, 'En az 2 karakter'),
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const parsed = signUpSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      Alert.alert('Eksik bilgi', parsed.error.issues[0]?.message ?? 'Formu kontrol edin');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(parsed.data.email, parsed.data.password, parsed.data.displayName);
    } catch (err) {
      Alert.alert('Kayıt başarısız', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Eyebrow>Hemen başla</Eyebrow>
      <Text style={styles.title}>Hesap oluştur</Text>

      <View style={styles.form}>
        <Field
          label="Görünen ad"
          placeholder="Adın"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Field
          label="E-posta"
          placeholder="ornek@eposta.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Şifre"
          placeholder="En az 6 karakter"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button
          label="Kayıt ol"
          onPress={onSubmit}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={font.muted}>Zaten hesabın var mı? </Text>
        <Link href="/(auth)/sign-in" style={styles.link}>
          Giriş yap
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  title: { ...font.display, fontSize: 26, marginTop: 4, marginBottom: spacing.lg },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  link: { fontWeight: '800', color: colors.brand },
});
