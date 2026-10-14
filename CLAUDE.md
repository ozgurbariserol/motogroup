# CLAUDE.md — MotoGroup

> Bu dosya Claude Code'un her oturumda okuduğu ana bağlam dosyasıdır.
> Proje kuralları, mimari kararlar, veri modeli ve kısıtlar burada tanımlıdır.
> Bir karara aykırı bir şey yapman gerekiyorsa **önce dur ve sor**.

---

## 1. Proje Özeti

Türkiye'deki motosiklet topluluğu için **kulüp işletim sistemi**. WhatsApp gruplarının dağınık kaosunu çözen; kulüp yönetimi, etkinlik organizasyonu, sürüş günü koordinasyonu ve rota paylaşımını tek platformda birleştiren bir mobil uygulama + web yönetim paneli.

**Konumlandırma (kritik):** Bu bir "navigasyon/rota uygulaması" DEĞİLDİR. Bizim farkımız **kulüp operasyonu**: üye yönetimi, etkinlik, RSVP, grup sohbeti, sürüş günü koordinasyonu. Navigasyon için kullanıcıyı Google Maps'e devrediyoruz, kendi navigasyonumuzu yapmıyoruz.

**Hedef kitle:** Büyük hacimli motor süren, kulüp/topluluk aidiyeti olan motorcular ve bu kulüplerin yöneticileri.

---

## 2. İş Modeli ve Ödeme Mimarisi (ÇOK ÖNEMLİ)

### Para nasıl kazanılıyor

- **Bireysel motorcu:** Ücretsiz. (Network effect için taban büyümeli.)
- **Kulübe katılmak:** Ücretsiz.
- **Kulüp KURMAK:** Ücretli. Kapasite bazlı abonelik.

### Fiyatlandırma — kapasite bazlı

Fatura tek (kulüp lideri öder). "Kişi başı" sadece iç hesaplama birimidir; **kullanıcıya kapasite paketi olarak gösterilir**, "kişi başı" diye sunulmaz.

| Paket                 | Üye limiti | Aylık (örnek) | Yıllık (örnek) |
| --------------------- | ---------- | ------------- | -------------- |
| Başlangıç             | 50         | 500₺          | 5.000₺         |
| Kulüp                 | 150        | 900₺          | 9.000₺         |
| Büyük Kulüp           | 400        | 1.500₺        | 15.000₺        |
| Chapter (çoklu şehir) | Sınırsız   | 2.500₺        | 25.000₺        |

(Rakamlar placeholder; kolayca değişebilir olmalı — DB/config'den okunsun, hard-code edilmesin.)

- Limit dolunca: **mevcut üyeyi ATMA**, sadece yeni üye eklemeyi durdur. Mesaj tonu ceza değil ödül: "Kulübün büyüyor, devam için kapasiteyi artır."
- Upgrade tek tıkla olmalı, fark hesaplanıp tahsil edilmeli.

### ⚠️ App Store / Google Play uyumluluğu — MİMARİYİ BELİRLEYEN KISIT

Türkiye ABD/AB değil → harici ödeme linki serbestliği YOK. Uygulama **içinde** satılan dijital abonelik → Apple IAP / Google Play Billing zorunlu olur (%15-30 kesinti, PayTR yasak).

**Çözümümüz — B2B/web satışı modeli (Notion/Slack gibi):**

- **Ödeme ve kulüp kurma SADECE WEB PANELİNDE yapılır** (PayTR ile). Para uygulama dışında el değiştirir → kesinti yok, PayTR serbest.
- **Mobil uygulama bir "client"tır.** İçinde ödeme akışı, "satın al" butonu veya harici ödeme linki **KESİNLİKLE OLMAZ** (anti-steering kuralı).
- Mobil app abonelik durumunu backend'den okur ve yansıtır; ödeme konusunda tamamen sessizdir.
- Kullanıcı ödeme/yükseltme iletişimi web ve e-posta üzerinden yapılır, app içinden DEĞİL.

**Kod yazarken kural:** Mobil app tarafında ödeme, fiyat satın alma butonu, PayTR linki, "web'de öde" yönlendirmesi içeren HİÇBİR ŞEY üretme. Bu özellikler yalnızca `apps/web` içinde yaşar. Bu kuralı ihlal eden bir talep gelirse uyar.

---

## 3. Teknik Stack

| Katman        | Teknoloji                               | Not                                                             |
| ------------- | --------------------------------------- | --------------------------------------------------------------- |
| Mobil         | React Native + **Expo** (TypeScript)    | Tek codebase iOS+Android. EAS Build.                            |
| Backend       | **Supabase**                            | Postgres + PostGIS + Auth + Realtime + Storage + Edge Functions |
| Web panel     | **Next.js** (App Router, TypeScript)    | Kulüp kurma, ödeme (PayTR), admin. Vercel'de host.              |
| Ödeme         | **PayTR**                               | Sadece web panelinde.                                           |
| Harita        | **react-native-maps** (Google provider) | "Maps'e at" için native handoff. Rota çizimi polyline.          |
| Bildirim      | **Expo Notifications**                  | Etkinlik, sohbet, üyelik bildirimleri.                          |
| State (mobil) | Zustand veya React Query                | Server state için React Query (TanStack).                       |
| Validasyon    | **Zod**                                 | Mobil + web paylaşımlı şemalar (packages/shared).               |

### Repo yapısı (monorepo — pnpm + Turborepo)

```
/
├── apps/
│   ├── mobile/        # Expo React Native app
│   └── web/           # Next.js web paneli (ödeme + admin)
├── packages/
│   └── shared/        # Zod şemaları, tipler, sabitler (iki app da kullanır)
├── supabase/
│   ├── migrations/    # SQL şema migration'ları
│   └── functions/     # Edge functions (kapasite kontrolü, PayTR webhook)
├── CLAUDE.md
└── README.md
```

---

## 4. Veri Modeli (Supabase / Postgres)

PostGIS aktif olmalı (`create extension postgis;`). Konum alanları `geography(Point, 4326)`.

### Tablolar

**profiles** (auth.users'a 1-1)

- `id` (uuid, PK, = auth.users.id)
- `display_name` (text)
- `city` (text)
- `avatar_url` (text, nullable)
- `created_at` (timestamptz)

**motorcycles**

- `id` (uuid, PK)
- `profile_id` (uuid, FK → profiles)
- `brand`, `model` (text)
- `year` (int), `cc` (int)
- `is_primary` (bool)

**clubs**

- `id` (uuid, PK)
- `name` (text), `description` (text)
- `city` (text)
- `moto_type` (text — adventure/chopper/sport/touring/naked...)
- `logo_url` (text, nullable)
- `owner_id` (uuid, FK → profiles)
- `capacity` (int) — abonelik paketinden gelir
- `member_count` (int, denormalized — trigger ile güncellenir)
- `subscription_status` (text — active/expired/pending)
- `subscription_tier` (text)
- `subscription_expires_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**club_members**

- `id` (uuid, PK)
- `club_id` (uuid, FK → clubs)
- `profile_id` (uuid, FK → profiles)
- `role` (text — owner/admin/member)
- `status` (text — pending/active)
- `joined_at` (timestamptz)
- UNIQUE(club_id, profile_id)

**events**

- `id` (uuid, PK)
- `club_id` (uuid, FK → clubs)
- `creator_id` (uuid, FK → profiles)
- `title`, `description` (text)
- `start_time` (timestamptz)
- `meeting_location` (geography Point) — harita pin
- `meeting_address` (text)
- `created_at` (timestamptz)

**event_attendees**

- `id` (uuid, PK)
- `event_id` (FK), `profile_id` (FK)
- `status` (text — going/not_going/maybe)
- UNIQUE(event_id, profile_id)

**routes**

- `id` (uuid, PK)
- `creator_id` (FK → profiles)
- `club_id` (FK → clubs, nullable — kişisel rota olabilir)
- `title`, `description` (text)
- `distance_km` (numeric), `difficulty` (text — kolay/orta/zor)
- `moto_type` (text)
- `gpx_url` (text — Supabase Storage)
- `start_location` (geography Point)
- `created_at`

**route_favorites**: (route_id, profile_id) UNIQUE
**route_comments**: id, route_id, profile_id, content, created_at
**event_comments**: id, event_id, profile_id, content, created_at

**messages** (sohbet — kulüp içi + etkinlik içi)

- `id` (uuid, PK)
- `club_id` (uuid, FK, nullable)
- `event_id` (uuid, FK, nullable) — ikisinden tam biri dolu olmalı (CHECK constraint)
- `sender_id` (FK → profiles)
- `content` (text)
- `created_at` (timestamptz)
- Realtime subscription bu tablo üzerinden.

**subscriptions** (ödeme kayıtları — web/PayTR)

- `id` (uuid, PK)
- `club_id` (FK)
- `tier` (text), `capacity` (int), `amount` (numeric)
- `status` (text — pending/paid/failed/refunded)
- `paytr_merchant_oid` (text)
- `period` (text — monthly/yearly)
- `starts_at`, `expires_at` (timestamptz)
- `created_at`

### Önemli kurallar (RLS + mantık)

- **Row Level Security TÜM tablolarda açık** olmalı. Anon erişim yok.
- Kulüp içeriğini (event, message, member) sadece o kulübün aktif üyeleri okuyabilir.
- Etkinlik/üye yönetimini sadece owner/admin yapabilir.
- **Kapasite gating:** `club_members`'a yeni aktif üye eklenmeden önce `member_count < capacity` ve `subscription_status = 'active'` kontrol edilmeli. Bunu bir Postgres trigger veya Edge Function ile sunucu tarafında zorla — sadece client'ta değil.
- `member_count` trigger ile otomatik güncellensin (insert/delete on club_members).
- PayTR ödeme onayı **webhook** ile gelir → Edge Function `subscriptions.status = 'paid'` yapar ve `clubs.subscription_status/capacity/expires_at` günceller. Client'a güvenme.

---

## 5. v1 Kapsamı

### VAR (v1)

1. **Auth & profil:** Supabase auth, profil, motosiklet ekleme (marka/model/yıl/cc), şehir.
2. **Kulüp:** Web'de kurma+ödeme; mobilde keşfet/ara, katıl/ayrıl, üye listesi, roller, kulüp profili.
3. **Mesajlaşma:** Kulüp içi grup sohbeti + etkinlik bazlı sohbet (Supabase Realtime). Minimal sosyal = sadece sohbet + yorum.
4. **Etkinlik:** Oluştur, haritadan buluşma noktası pin, "Google Maps'e at", RSVP (katılıyorum/katılmıyorum), yorum.
5. **Rota:** GPX yükle veya haritadan çiz, detay (mesafe/zorluk/motor tipi), başlangıç noktasını Maps'e at, favori, yorum.
6. **Yakınımdaki:** PostGIS ile yakın etkinlik/kulüp/rota listesi (ST_DWithin).

### YOK (bilinçli olarak v1 dışı)

- Kendi navigasyonu (Google Maps'e devret)
- Bireysel DM (sadece grup sohbeti yeter — v2)
- Sosyal feed/timeline (karmaşıklaştırır)
- Pazaryeri (v3)
- Crash detection / canlı konum takibi (v2+, hassas; güven riski)
- Aidat tahsilatı modülü (v2 — kulübün kendi üyelerinden para toplaması)
- Mobil app içi ödeme (asla — bkz. Bölüm 2)

---

## 6. Ekran Akışları

### Mobil

```
Açılış → Auth (kayıt/giriş)
       → Onboarding (motor ekle, şehir seç)
       → Ana ekran (yakınımdaki etkinlikler + kulüplerim)
Kulüpler: keşfet/ara → kulüp detay → katıl → üye listesi → kulüp sohbeti
Etkinlik: liste → detay (harita pin + Maps'e at + RSVP + yorum) → etkinlik sohbeti
Rota: liste → detay (GPX/harita, Maps'e at, favori, yorum)
Profil: motosikletler, kulüplerim, etkinliklerim, rotalarım
```

(Mobilde HİÇBİR ödeme ekranı yok.)

### Web paneli

```
Giriş (kulüp yöneticisi)
→ Kulüp kur (kapasite paketi seç)
→ PayTR ödeme
→ Dashboard: üye yönetimi, etkinlik yönetimi, abonelik durumu
→ Kapasiteyi yükselt / yenile (PayTR)
```

---

## 7. Geliştirme İş Akışı (Claude Code için)

Her görevde şu sırayı izle:

1. **Niyet/Plan:** Görevi anla. Hangi tablolar, hangi ekranlar, hangi dosyalar etkileniyor? Önce kısa bir plan çıkar, varsayımları belirt.
2. **Uygulama:** Plana göre yaz. Mevcut konvansiyonlara (TS strict, Zod validasyon, paylaşımlı tipler) uy.
3. **Güvenlik incelemesi (zorunlu adım):** Yazdıktan sonra kendini denetle:
   - RLS açık mı? Yetkisiz okuma/yazma mümkün mü?
   - Kapasite/abonelik kontrolü sunucu tarafında mı (client bypass edilebilir mi)?
   - PayTR webhook imza doğrulaması yapılıyor mu?
   - Secret/key client bundle'a sızıyor mu? (Supabase service_role key ASLA client'ta olmaz, sadece Edge Function'da.)
   - Mobil app'e yanlışlıkla ödeme/steering linki eklendi mi? (App Store red sebebi.)
4. **Özet:** Ne değişti, ne test edilmeli, kısa not.

### Kod konvansiyonları

- TypeScript `strict: true`. `any` kullanma; gerekiyorsa `unknown` + daraltma.
- Tüm dış girdi (form, API, webhook) **Zod** ile valide edilsin.
- Supabase sorguları tiplenmiş olsun (generated types: `supabase gen types typescript`).
- Mobil + web ortak tip/sabit/şema → `packages/shared`. Tekrar yazma.
- Component dosyaları küçük ve tek sorumlu. İş mantığını hook/util'e ayır.
- Para birimi, fiyat paketleri, kapasite limitleri → config/DB'den, hard-code etme.
- Türkçe karakter ve i18n: kullanıcıya görünen metinler Türkçe.

### Ortam / env

- `.env` dosyaları repoya GİRMEZ. `.env.example` tut.
- Mobil: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY`
- Web: yukarıdakiler + `SUPABASE_SERVICE_ROLE_KEY` (server-only), `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`
- Supabase service_role ve PayTR secret'ları SADECE server/Edge Function tarafında.

---

## 8. Başlangıç Adımları (ilk oturum sırası)

1. Monorepo iskeleti (pnpm + Turborepo): `apps/mobile`, `apps/web`, `packages/shared`.
2. Supabase projesi + PostGIS extension + ilk migration (Bölüm 4 şeması) + RLS politikaları.
3. `packages/shared`: Zod şemaları ve TS tipleri.
4. Mobil: Expo init, Supabase auth, onboarding (motor + şehir), ana ekran iskeleti.
5. Web: Next.js init, kulüp kurma formu + kapasite seçimi (ödeme henüz mock).
6. Etkinlik + harita pin + Maps handoff.
7. Realtime sohbet.
8. Rota (GPX + favori).
9. EN SON: PayTR entegrasyonu (web) + webhook + kapasite aktivasyonu. (Önce tüm ürün çalışsın, sonra para bağlansın.)

---

## 9. Karar Verirken Hatırla

- Şüphedeysen **sor**, varsayımla ilerleme — özellikle ödeme, RLS, kapasite mantığında.
- Mobil app içine ödeme/steering ekleme talebi → uyar, ekleme.
- Fiyat/kapasite rakamları placeholder; config'den okunabilir tut.
- Konumlandırma "kulüp işletim sistemi", "navigasyon app'i" değil. Özellik kararlarında bunu koru.
