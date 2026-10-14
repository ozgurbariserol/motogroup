# Mimari

MotoGroup, Türkiye'deki motosiklet toplulukları için bir **kulüp işletim sistemi**dir:
üye yönetimi, etkinlik organizasyonu, sürüş günü koordinasyonu, grup sohbeti ve rota
paylaşımı. Navigasyon app'i **değildir** — navigasyon Google Maps'e devredilir.

## Sistem genel görünüm

```
┌─────────────────┐         ┌─────────────────┐
│  Mobil (Expo)   │         │   Web (Next.js) │
│  React Native   │         │   admin + ödeme │
│  - client only  │         │   - PayTR       │
└────────┬────────┘         └────────┬────────┘
         │  anon key (RLS)           │  anon (cookie) + service_role (server)
         ▼                           ▼
              ┌──────────────────────────────┐
              │          Supabase             │
              │  Postgres + PostGIS           │
              │  Auth · Realtime · Storage    │
              │  RLS · Trigger · RPC          │
              │  Edge Functions (PayTR webhook)│
              └──────────────────────────────┘
                           ▲
                           │ server-to-server (HMAC imzalı)
                   ┌───────┴────────┐
                   │     PayTR      │
                   └────────────────┘
```

## Monorepo (pnpm + Turborepo)

```
apps/mobile      Expo (React Native) — client; ÖDEME YOK (anti-steering)
apps/web         Next.js (App Router) — kulüp kurma, PayTR ödeme, admin
packages/shared  Zod şemaları, sabitler (fiyat/kapasite, proration), DB tipleri
supabase/
  migrations/    Şema, RLS, trigger, RPC (sıralı, zaman damgalı)
  functions/     Edge Functions (paytr-webhook)
  tests/         psql tabanlı mantık + RLS testleri
tests/integration/  Vitest E2E (gerçek auth oturumları, yerel Supabase)
```

Durum yönetimi: server state için **React Query**; tüm dış girdi **Zod** ile valide edilir.

## Veri modeli (özet)

`profiles` (1-1 auth.users) · `motorcycles` · `clubs` · `club_members` · `events` ·
`event_attendees` · `routes` · `route_favorites` · `route_comments` · `event_comments` ·
`messages` (kulüp **veya** etkinlik — CHECK ile tam biri) · `subscriptions`.

Konum alanları `geography(Point,4326)` (PostGIS). View'lar (`events_view`, `routes_view`)
lat/lng açar; `events_nearby`/`routes_nearby` RPC'leri `ST_DWithin` ile yakınlık sorgular.

## Güvenlik modeli

- **RLS her tabloda açık.** Anon erişim yok; politikalar `authenticated`'a tanımlı.
  Kulüp içeriği (üye listesi/etkinlik/mesaj) yalnızca o kulübün **aktif** üyelerine.
  Yardımcılar: `is_club_member`, `is_club_admin`, `is_event_member`,
  `shares_active_club_with` (hepsi `SECURITY DEFINER` → policy özyinelemesi yok).
- **Sunucu tarafı zorlama.** `member_count` denormalize sayaç + **kapasite gating**
  trigger ile (aktif üye eklenmeden `member_count < capacity` ve abonelik `active`
  kontrolü). Abonelik/kapasite kolonları `protect_club_subscription_columns` ile
  client değişikliğine kapalı; yalnızca güvenilen RPC'ler (işlem-yerel GUC bayrağı)
  veya `service_role` değiştirir.
- **PostgREST GRANT'leri.** `authenticated`'a tablo DML + yardımcı fonksiyon execute;
  `anon` yetkisiz. Hassas RPC'ler (`create_pending_club`, `mark_subscription_paid`,
  `create_upgrade_subscription`) yalnızca `service_role`.

## Ödeme akışı (B2B / web — App Store uyumu)

Ödeme **yalnızca web panelinde** (PayTR), mobil tamamen sessiz. Akış:

1. Web `startCheckout`/`startUpgrade` → `create_pending_club` /
   `create_upgrade_subscription` (service_role) ile **pending** abonelik + PayTR token.
2. Kullanıcı PayTR iframe'inde öder.
3. PayTR → **webhook** (Edge Function) → HMAC imza doğrulanır →
   `mark_subscription_paid` → kulüp kapasitesi/tier/bitiş güncellenir (idempotent).

Yükseltmede tahsil edilecek **fark**, kalan süreye orantılı kredi düşülerek
`computeUpgradeAmount` (packages/shared) ile **sunucuda** hesaplanır; client'tan fiyat alınmaz.

## Realtime

Grup sohbeti `messages` tablosu üzerinden Supabase Realtime (`postgres_changes`).
RLS'e saygı duyar (yalnızca üye olunan sohbetin mesajları gelir); RLS değerlendirmesi
için tablo `REPLICA IDENTITY FULL`.

## Test stratejisi

| Katman    | Araç                 | Kapsam                                              |
| --------- | -------------------- | --------------------------------------------------- |
| Birim     | Vitest               | İş mantığı (proration), Zod şema kuralları          |
| DB / RLS  | psql + assert        | Trigger, RPC, kapasite gating, CHECK, RLS izolasyon |
| Uçtan uca | Vitest + supabase-js | Gerçek auth oturumlarıyla tam akışlar               |

CI (GitHub Actions) her push/PR'da: lint · typecheck · format · birim testleri; ayrı
job'da `supabase start` ile DB/RLS/E2E entegrasyon testleri.

## Dağıtım (hedef)

- Web → Vercel (env: NEXT_PUBLIC_* + SUPABASE_SERVICE_ROLE_KEY + PAYTR_*).
- Supabase → barındırılan proje; `supabase db push` + `supabase functions deploy paytr-webhook`.
- Mobil → EAS Build (iOS/Android); push/harita için dev build.
