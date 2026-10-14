## Ne değişti?

<!-- Kısa özet: hangi özellik/düzeltme, neden. -->

## Etkilenenler

- [ ] Mobil (`apps/mobile`)
- [ ] Web (`apps/web`)
- [ ] Paylaşımlı (`packages/shared`)
- [ ] Veritabanı (`supabase/migrations`) — yeni migration eklendiyse RLS + test güncellendi mi?
- [ ] Edge Function (`supabase/functions`)

## Kontrol listesi

- [ ] `pnpm lint` temiz
- [ ] `pnpm typecheck` temiz
- [ ] `pnpm format:check` temiz
- [ ] `pnpm test` (birim) geçiyor
- [ ] Gerekiyorsa `pnpm test:integration` (DB/E2E) yerelde geçiyor
- [ ] Yeni tablo/kolon eklendiyse: RLS politikası + `supabase/tests/` testi var
- [ ] Mobil tarafa ödeme/fiyat/steering EKLENMEDİ (CLAUDE.md Bölüm 2)
- [ ] Secret/key client bundle'a sızmıyor (service_role / PAYTR_* server-only)

## Notlar

<!-- Test edilmesi gerekenler, riskler, ekran görüntüleri. -->
