# @motogroup/web

Next.js (App Router + TypeScript) web yönetim paneli — kulüp kurma, ödeme (PayTR),
admin dashboard. Vercel'de host edilir.

Ödeme ve kulüp kurma **yalnızca burada** yaşar (CLAUDE.md Bölüm 2). `SUPABASE_SERVICE_ROLE_KEY`
ve `PAYTR_*` yalnızca server tarafında (Server Action / Route Handler) kullanılır.

## Çalıştırma

```bash
cp .env.example .env.local   # NEXT_PUBLIC_* + SUPABASE_SERVICE_ROLE_KEY doldurun
pnpm --filter @motogroup/web dev
```

## Yapı

```
src/
├── app/
│   ├── page.tsx              # oturuma göre /login veya /dashboard
│   ├── login/                # giriş + kayıt (client)
│   ├── dashboard/            # kulüplerim + abonelik durumu, çıkış
│   └── clubs/new/            # kulüp kurma formu + kapasite paketi + MOCK ödeme
├── lib/
│   ├── env.ts               # zod ile env doğrulama (public + server-only ayrı)
│   └── supabase/            # browser / server (cookie) / admin (service_role) client
└── middleware.ts            # Supabase oturum tazeleme
```

## Mevcut kapsam (Bölüm 8 adım 5 + 9)

- Auth (kulüp yöneticisi giriş/kayıt)
- Kulüp kurma + kapasite paketi seçimi + periyot
- **Gerçek PayTR ödeme akışı** (iframe API):
  1. `startCheckout` server action kulübü `pending` + bekleyen abonelik olarak oluşturur
     (`create_pending_club` RPC) ve PayTR iframe token'ı üretir.
  2. Kullanıcı PayTR iframe'inde öder.
  3. **Webhook** (`supabase/functions/paytr-webhook`) imzayı doğrular ve
     `mark_subscription_paid` ile kapasiteyi/aboneliği **sunucuda** aktive eder.
     Tarayıcı redirect'ine değil, sunucu-sunucu bildirimine güvenilir.

### PayTR / webhook kurulumu

1. Web env (`.env.local`): `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`.
2. Edge Function secret'ları:
   ```bash
   supabase secrets set PAYTR_MERCHANT_KEY=... PAYTR_MERCHANT_SALT=...
   supabase functions deploy paytr-webhook --no-verify-jwt
   ```
   (`--no-verify-jwt`: PayTR JWT göndermez; güvenlik hash imzasıyla sağlanır.)
3. PayTR mağaza panelinde **Bildirim URL**'ini deploy edilen fonksiyona ayarla:
   `https://<proje-ref>.supabase.co/functions/v1/paytr-webhook`
4. `SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_URL` Edge runtime tarafından otomatik sağlanır.
