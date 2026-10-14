-- 20260630000011_upgrade_rpc.sql
-- MotoGroup — abonelik yükseltme/yenileme (CLAUDE.md Bölüm 2).
--
-- Akış: mevcut kulübe YENİ tier için 'pending' bir abonelik kaydı oluşturulur
-- (create_upgrade_subscription). Kullanıcı PayTR ile farkı öder; webhook
-- mark_subscription_paid'i çağırır → kulübün kapasitesi/tier'ı/bitiş tarihi yeni
-- pakete göre güncellenir (bu mantık zaten mevcut). Böylece yükseltme, kulüp kurma
-- ile aynı ödeme+webhook altyapısını yeniden kullanır.
--
-- service_role'e açık; client çağıramaz. Tutar (fark) sunucuda hesaplanıp p_amount
-- olarak verilir; client'tan fiyat alınmaz.

set search_path = public, extensions;

create or replace function public.create_upgrade_subscription(
  p_club_id uuid,
  p_tier text,
  p_capacity int,
  p_amount numeric,
  p_period text,
  p_merchant_oid text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.clubs where id = p_club_id) then
    raise exception 'Kulüp bulunamadı: %', p_club_id using errcode = 'no_data_found';
  end if;

  insert into public.subscriptions (
    club_id, tier, capacity, amount, status, paytr_merchant_oid, period, starts_at, expires_at
  )
  values (
    p_club_id, p_tier, p_capacity, p_amount, 'pending', p_merchant_oid, p_period, null, null
  );
end;
$$;

revoke all on function public.create_upgrade_subscription(uuid, text, int, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.create_upgrade_subscription(uuid, text, int, numeric, text, text)
  to service_role;
