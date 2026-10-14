# MotoGroup

[![CI](https://github.com/ozgurbariserol/motogroup/actions/workflows/ci.yml/badge.svg)](https://github.com/ozgurbariserol/motogroup/actions/workflows/ci.yml)

Türkiye'deki motosiklet toplulukları için **kulüp işletim sistemi**. Üye yönetimi,
etkinlik organizasyonu, sürüş günü koordinasyonu, grup sohbeti ve rota paylaşımı tek
platformda. (Navigasyon app'i **değildir** — navigasyon Google Maps'e devredilir.)

> **Durum / Status:** 2026 proje, v1 kapsamı yazıldı; **sürdürülmüyor**. Fork'layabilirsin (MIT).
> Mobil, web, gerçek zamanlı sohbet, PostGIS ve ödeme tek bir monorepo'da. /
> A 2026 project, v1 scope implemented, **not maintained**; fork it freely (MIT).
> Mobile, web, realtime chat, PostGIS and payments in one monorepo.
>
> - Proje kuralları ve veri modeli → [CLAUDE.md](./CLAUDE.md)
> - Mimari → [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
> - Geliştirme → [CONTRIBUTING.md](./CONTRIBUTING.md) · Güvenlik → [SECURITY.md](./SECURITY.md)

## Özellikler

- **Auth & profil** — Supabase auth, motosiklet ekleme, şehir
- **Kulüp** — web'de kur + ödeme (PayTR); mobilde keşfet/ara/katıl/ayrıl, üye yönetimi, profil/logo
- **Etkinlik** — oluştur, harita pin, "Google Maps'e at", RSVP, yorum
- **Sohbet** — kulüp + etkinlik grup sohbeti (Supabase Realtime)
- **Rota** — GPX yükle / haritadan çiz, favori, yorum, yakınımdaki (PostGIS)
- **Abonelik** — kapasite paketleri, yükseltme/yenileme (orantılı fark, PayTR webhook)

## Teknoloji

Expo (React Native) · Next.js · Supabase (Postgres + PostGIS + Auth + Realtime + Storage +
Edge Functions) · PayTR · Zod · React Query · pnpm + Turborepo · Vitest.

## Monorepo

```
apps/mobile        Expo (client; ödeme YOK)
apps/web           Next.js (admin + PayTR ödeme)
packages/shared    Zod şemaları, sabitler, DB tipleri
supabase/          migrations · functions · tests
tests/integration  Vitest E2E (yerel Supabase'e karşı)
```

## Başlangıç

```bash
pnpm install
cp .env.example .env                  # + apps/*/.env.example → .env(.local)
npx supabase start                    # yerel Postgres + PostGIS + Auth + Storage
```

Çalıştırma: `pnpm --filter @motogroup/web dev` · `pnpm --filter @motogroup/mobile dev`.
Ayrıntılı kurulum ve tüm komutlar için [CONTRIBUTING.md](./CONTRIBUTING.md).

## Komutlar

| Komut                    | Açıklama                                       |
| ------------------------ | ---------------------------------------------- |
| `pnpm lint`              | ESLint                                         |
| `pnpm typecheck`         | TypeScript strict (3 paket)                    |
| `pnpm format` / `:check` | Prettier                                       |
| `pnpm test`              | Vitest birim testleri (DB gerektirmez)         |
| `pnpm test:integration`  | Vitest E2E (çalışan yerel Supabase gerektirir) |
| `pnpm build`             | Tümünü derle                                   |

## Test & CI

- **Birim** (Vitest) — iş mantığı (proration) + Zod kuralları.
- **DB / RLS** (`supabase/tests/*.sql`) — trigger, RPC, kapasite gating, RLS izolasyonu.
- **Uçtan uca** (`tests/integration`) — gerçek auth oturumlarıyla tam akışlar.

CI her push/PR'da lint · typecheck · format · birim testlerini ve ayrı bir job'da
`supabase start` ile DB/RLS/E2E entegrasyon testlerini çalıştırır.

### Doğrulama durumu (2026-10-14)

Bu depo yayınlanmadan önce temiz bir kopyada kuruldu: `pnpm install`, `pnpm lint`,
`pnpm format:check`, üç paketin `tsc --noEmit` kontrolü ve 19 birim test **geçti**.
**Çalıştırılmadı:** DB/RLS testleri ve uçtan uca testler (yerel Supabase gerektirir),
mobil uygulamanın bir cihazda çalıştırılması, PayTR ile gerçek bir ödeme.
Fiyat rakamları yer tutucudur (`packages/shared/src/constants.ts`).
