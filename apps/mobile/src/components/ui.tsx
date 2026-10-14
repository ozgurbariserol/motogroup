import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from 'react-native';
import { MOTO_ICON } from '@/lib/icons';
import { colors, font, radius, shadow, spacing } from '@/theme';

/** Motosiklet ikonu (MaterialCommunityIcons) — glyph adı tek kaynaktan (MOTO_ICON). */
export function MotoIcon({ size = 20, color = colors.brand }: { size?: number; color?: string }) {
  return <MaterialCommunityIcons name={MOTO_ICON} size={size} color={color} />;
}

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'brandSoft';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewProps['style'];
};
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'brandSoft' && styles.btnBrandSoft,
        (disabled || loading) && styles.btnDisabled,
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.brand} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'ghost' && { color: colors.ink },
            variant === 'brandSoft' && { color: colors.brand },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Sağ-alt yüzen aksiyon butonu (FAB) — dolu liste görünümünde "+ ekle" için. */
export function Fab({
  onPress,
  icon = 'add',
  accessibilityLabel,
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.inkFaint} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Pill({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'muted';
}) {
  const map = {
    success: { bg: colors.successTint, fg: colors.success },
    warning: { bg: colors.warningTint, fg: colors.warning },
    muted: { bg: '#EEF0F3', fg: colors.inkSoft },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: map.fg }]} />
      <Text style={[styles.pillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Text style={{ fontSize: size * 0.5 }}>🏍️</Text>
    </View>
  );
}

type EmptyStateAction = { label: string; onPress: () => void };

/**
 * Tutarlı, profesyonel boş durum. Ikon (Ionicons) + başlık + açıklama + opsiyonel
 * birincil (dolu turuncu) ve ikincil (yalnızca metin) aksiyon. Renkler tema sabitlerinden.
 * FlatList'te dikey ortalamak için `style={{ flex: 1 }}` geçir.
 */
export function EmptyState({
  icon,
  iconSet = 'ionicons',
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconSet?: 'ionicons' | 'material';
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: ViewProps['style'];
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        {iconSet === 'material' ? (
          <MaterialCommunityIcons
            name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={28}
            color={colors.brand}
          />
        ) : (
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={colors.brand} />
        )}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
      {primaryAction ? (
        <Button
          label={primaryAction.label}
          onPress={primaryAction.onPress}
          style={styles.emptyPrimary}
        />
      ) : null}
      {secondaryAction ? (
        <Pressable
          onPress={secondaryAction.onPress}
          style={styles.emptySecondary}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.emptySecondaryText}>{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  btn: {
    height: 50,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.brand, ...shadow.brand },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.brand,
  },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnBrandSoft: { backgroundColor: colors.brandTint },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.white, fontSize: 15.5, fontWeight: '700' },
  label: { ...font.caption, color: colors.ink, fontSize: 13.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 7, height: 7, borderRadius: 999 },
  pillText: { fontSize: 12.5, fontWeight: '700' },
  section: { ...font.title, fontSize: 18, marginBottom: spacing.sm },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand,
  },
  brandMark: {
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.brand,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  emptyDesc: { ...font.muted, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  emptyPrimary: { marginTop: spacing.md, minWidth: 200 },
  emptySecondary: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emptySecondaryText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
});
