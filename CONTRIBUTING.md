# Katkı Rehberi

> Bu özel (proprietary) bir projedir. Geliştirme kuralları ve mimari kararlar için
> ayrıca [CLAUDE.md](./CLAUDE.md) ve [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
> dosyalarını oku.

## Gereksinimler

- Node.js >= 22 (`.nvmrc`)
- pnpm 10.x (`corepack enable`)
- Docker Desktop (yerel Supabase için)
- Supabase CLI (`npx supabase ...` da çalışır)

## Kurulum

```bash
pnpm install
cp .env.example .env                 # ve apps/*/.env.example → ilgili .env(.local)
npx supabase start                   # yerel Postgres + PostGIS + Auth + Storage
```

## Komutlar

| Komut                                 | Açıklama                                       |
| ------------------------------------- | ---------------------------------------------- |
| `pnpm lint`                           | ESLint (tüm repo)                              |
| `pnpm typecheck`                      | TypeScript strict (3 paket)                    |
| `pnpm format` / `:check`              | Prettier                                       |
| `pnpm test`                           | Vitest birim testleri (hızlı, DB gerektirmez)  |
| `pnpm test:integration`               | Vitest E2E (çalışan yerel Supabase gerektirir) |
| `pnpm --filter @motogroup/web dev`    | Web paneli                                     |
| `pnpm --filter @motogroup/mobile dev` | Expo mobil app                                 |

### DB / RLS testleri

```bash
# Mantık (trigger/RPC/kapasite) ve RLS izolasyon testleri
docker exec -i supabase_db_motogroup psql -U postgres -d postgres < supabase/tests/00_logic_test.sql
docker exec -i supabase_db_motogroup psql -U postgres -d postgres < supabase/tests/01_rls_test.sql
```

Supabase tiplerini yeniden üretmek:

```bash
npx supabase gen types typescript --local > packages/shared/src/database.types.ts
```

## Dal & commit kuralları

- `main` korumalıdır; doğrudan push yerine PR aç.
- Commit mesajları **Conventional Commits**: `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `test:`.
- PR açmadan önce yerelde geçmesi gerekenler: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test`.
- CI (GitHub Actions) ayrıca her PR'da DB/RLS/E2E entegrasyon testlerini çalıştırır.

## Kritik kurallar (CLAUDE.md'den)

- **Mobil app içinde ödeme/fiyat/"satın al" YOK** (App Store anti-steering). Ödeme yalnızca `apps/web` (PayTR).
- **RLS tüm tablolarda açık**; yeni tablo → RLS politikası + `supabase/tests/` testi.
- `service_role` ve PayTR secret'ları yalnızca server/Edge Function tarafında.
- Kapasite/abonelik mantığı **sunucuda** zorlanır (trigger/RPC), client'a güvenilmez.
