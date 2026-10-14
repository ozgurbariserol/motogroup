// MotoGroup tasarım dili — mobil. Web ile aynı marka paleti (turuncu accent + koyu ink).
export const colors = {
  brand: '#F25C05',
  brandStrong: '#D24A00',
  brandTint: '#FFF1E8',
  ink: '#15171C',
  inkSoft: '#6B7280',
  inkFaint: '#9AA1AB',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#E8E9EE',
  success: '#16A34A',
  successTint: '#E7F7ED',
  warning: '#B45309',
  warningTint: '#FDF2E3',
  danger: '#DC2626',
  white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const font = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.ink },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.ink },
  muted: { fontSize: 14, fontWeight: '400' as const, color: colors.inkSoft },
  caption: { fontSize: 12.5, fontWeight: '600' as const, color: colors.inkFaint },
} as const;

export const shadow = {
  card: {
    shadowColor: '#10121A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  brand: {
    shadowColor: colors.brand,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
