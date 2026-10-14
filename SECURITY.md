# Güvenlik Politikası

## Açık bildirimi

Bir güvenlik açığı bulursan **issue açma**. Doğrudan repo sahibine özel olarak
bildir (GitHub üzerinden veya e-posta ile). Düzeltme yayınlanana kadar açığı
kamuya açıklama.

## Güvenlik modeli (özet)

- **Yetkilendirme = Postgres RLS.** Tüm tablolarda Row Level Security açıktır;
  `anon` rolünün veri erişimi yoktur. Politikalar `authenticated` rolüne tanımlıdır.
  Her tablo için RLS davranışı `supabase/tests/01_rls_test.sql` ile otomatik test edilir.
- **Sunucu tarafı zorlama.** Kapasite limiti ve abonelik durumu Postgres trigger/RPC
  ile zorlanır (client bypass edilemez). `supabase/tests/00_logic_test.sql` doğrular.
- **Secret yönetimi.** `SUPABASE_SERVICE_ROLE_KEY` ve `PAYTR_*` yalnızca server/Edge
  Function tarafında bulunur; `NEXT_PUBLIC_`/`EXPO_PUBLIC_` ile client'a ASLA sızmaz.
  `.env*` dosyaları repoya girmez (yalnızca `.env.example`).
- **PayTR webhook.** Ödeme bildirimleri HMAC-SHA256 imza doğrulamasından geçer
  (`supabase/functions/paytr-webhook`); imzasız/forge bildirimler işlenmez.
- **Storage.** GPX ve logo bucket'larında yazma, ilgili kaynağın sahibine/yöneticisine
  (path + `is_club_admin`) kısıtlıdır; okuma keşif için public'tir.
- **Mobil = client.** Mobil uygulamada ödeme akışı veya harici ödeme yönlendirmesi
  bulunmaz (App Store/Play Store uyumluluğu).

## Bağımlılıklar

Dependabot haftalık olarak npm ve GitHub Actions bağımlılıklarını tarar
(`.github/dependabot.yml`).
