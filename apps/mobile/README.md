# @motogroup/mobile

Expo (React Native + TypeScript) mobil uygulama — iOS + Android tek codebase.
Expo Router (dosya tabanlı yönlendirme), Supabase auth, React Query, Zustand.

## Kritik kural (CLAUDE.md Bölüm 2)

Bu app bir **client**'tır. İçinde **ödeme akışı, "satın al" butonu, fiyat gösterimi
veya PayTR/harici ödeme linki KESİNLİKLE OLMAZ** (App Store anti-steering kuralı).
Abonelik durumu yalnızca backend'den okunup yansıtılır. Ödeme tamamen `apps/web`'de yaşar.

## Çalıştırma

```bash
cp .env.example .env   # Supabase URL + ANON key doldurun (service_role ASLA buraya konmaz)
pnpm --filter @motogroup/mobile dev
```

## Yapı

```
app/                      # Expo Router rotaları
├── _layout.tsx           # Providers + RouteGuard (auth/onboarding yönlendirme)
├── index.tsx             # Giriş yönlendirmesi
├── (auth)/               # sign-in, sign-up
├── onboarding.tsx        # Motor + şehir (shared zod ile valide)
└── (tabs)/               # Ana sayfa, Kulüpler, Profil
src/
├── lib/                  # env, supabase client, queryClient, auth provider
└── features/profile/     # useProfile hook
```

Mevcut kapsam: auth + onboarding + ana ekran iskeleti (CLAUDE.md Bölüm 8 adım 4).
Etkinlik/harita, sohbet ve rota sonraki adımlarda gelir.
