import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { BrandMark, Button, Eyebrow, Field } from '@/components/ui';
import { signInWithEmail } from '@/lib/auth';
import { colors, font, spacing } from '@/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      Alert.alert('Giriş başarısız', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <BrandMark size={56} />
        <Text style={styles.logo}>MotoGroup</Text>
        <Text style={font.muted}>Kulübüne giriş yap</Text>
      </View>

      <View style={styles.form}>
        <Eyebrow>Tekrar hoş geldin</Eyebrow>
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
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button
          label="Giriş yap"
          onPress={onSubmit}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={font.muted}>Hesabın yok mu? </Text>
        <Link href="/(auth)/sign-up" style={styles.link}>
          Kayıt ol
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  header: { alignItems: 'center', gap: 8, marginBottom: spacing.xxl },
  logo: { ...font.display, marginTop: 6 },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  link: { fontWeight: '800', color: colors.brand },
});
