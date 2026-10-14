-- 20260630000005_rpc.sql
-- MotoGroup — kulüp provizyon RPC'leri (CLAUDE.md Bölüm 4 & 8 adım 9).
--
-- Ödeme akışı (PayTR):
--   1) create_pending_club: kulübü 'pending' olarak + owner üyeliğini + 'pending'
--      abonelik kaydını TEK transaction'da oluşturur. Henüz kapasite YOK (0), üye eklenemez.
--   2) Kullanıcı web panelinde PayTR ile öder.
--   3) PayTR webhook'u (Edge Function) imzayı doğrular ve mark_subscription_paid'i çağırır:
--      abonelik 'paid' olur, kulüp kapasitesi + 'active' durumu + bitiş tarihi yazılır.
--
-- Her iki fonksiyon da SECURITY DEFINER ve YALNIZCA service_role'e açıktır; client
-- (anon/authenticated) çağıramaz. Tutar/kapasite sunucuda belirlenir (client'a güvenme).

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- create_pending_club — ödeme öncesi iskelet. Kulüp 'pending', kapasite 0.
-- ---------------------------------------------------------------------------
-- Opsiyonel (nullable) parametreler 'default null' ile sonda — hem doğru şema tasarımı
-- hem de supabase gen types'ın bunları 'string | null' (opsiyonel) tiplemesi için.
-- PostgREST adlandırılmış parametre kullandığından JS çağrısında sıra önemsizdir.
create or replace function public.create_pending_club(
  p_owner uuid,
  p_name text,
  p_tier text,
  p_capacity int,
  p_amount numeric,
  p_period text,
  p_merchant_oid text,
  p_description text default null,
  p_city text default null,
  p_moto_type text default null,
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
begin
  insert into public.clubs (
    name, description, city, moto_type, logo_url, owner_id,
    capacity, member_count, subscription_status, subscription_tier, subscription_expires_at
  )
  values (
    p_name, p_description, p_city, p_moto_type, p_logo_url, p_owner,
    0, 0, 'pending', p_tier, null
  )
  returning id into v_club_id;

  -- Kurucu owner olarak eklenir (kapasite trigger'ı owner'ı muaf tutar; pending'de bile girer).
  insert into public.club_members (club_id, profile_id, role, status)
  values (v_club_id, p_owner, 'owner', 'active');

  -- Bekleyen ödeme kaydı (PayTR merchant_oid ile eşlenir).
  insert into public.subscriptions (
    club_id, tier, capacity, amount, status, paytr_merchant_oid, period, starts_at, expires_at
  )
  values (
    v_club_id, p_tier, p_capacity, p_amount, 'pending', p_merchant_oid, p_period, null, null
  );

  return v_club_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_subscription_paid — webhook onayında çağrılır. Idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.mark_subscription_paid(p_merchant_oid text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_now timestamptz := now();
  v_expires timestamptz;
begin
  select * into v_sub
  from public.subscriptions
  where paytr_merchant_oid = p_merchant_oid
  for update;

  if not found then
    raise exception 'Abonelik bulunamadı: %', p_merchant_oid using errcode = 'no_data_found';
  end if;

  -- Zaten işlenmişse tekrar işleme (PayTR webhook'u birden çok kez çağırabilir).
  if v_sub.status = 'paid' then
    return v_sub.club_id;
  end if;

  v_expires := case
    when v_sub.period = 'yearly' then v_now + interval '1 year'
    else v_now + interval '1 month'
  end;

  update public.subscriptions
  set status = 'paid', starts_at = v_now, expires_at = v_expires
  where id = v_sub.id;

  -- Güvenilen yol: protect_club_subscription_columns trigger'ına bu transaction'da
  -- kapasite/abonelik güncellemesine izin verildiğini bildir (işlem-yerel bayrak).
  perform set_config('app.bypass_club_protect', '1', true);

  update public.clubs
  set capacity = v_sub.capacity,
      subscription_status = 'active',
      subscription_tier = v_sub.tier,
      subscription_expires_at = v_expires
  where id = v_sub.club_id;

  return v_sub.club_id;
end;
$$;

-- Her iki fonksiyon da yalnızca service_role'e açık (client çağıramaz).
revoke all on function public.create_pending_club(
  uuid, text, text, int, numeric, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_pending_club(
  uuid, text, text, int, numeric, text, text, text, text, text, text
) to service_role;

revoke all on function public.mark_subscription_paid(text) from public, anon, authenticated;
grant execute on function public.mark_subscription_paid(text) to service_role;
