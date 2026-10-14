-- 20260630000003_triggers.sql
-- MotoGroup — sunucu tarafı iş kuralları (CLAUDE.md Bölüm 4 "Önemli kurallar").
--   1. auth.users → profiles otomatik satır.
--   2. clubs.member_count denormalize sayaç (aktif üye sayısı).
--   3. Kapasite gating: aktif üye eklenmeden önce member_count < capacity ve
--      subscription_status = 'active'. Client bypass edilemez — sunucuda zorlanır.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Yeni auth kullanıcısı için profil satırı oluştur.
--    SECURITY DEFINER — auth şemasındaki trigger public.profiles'a yazabilsin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. member_count = ilgili kulübün AKTİF üye sayısı.
--    Insert/update/delete sonrası etkilenen kulüp(ler) için yeniden hesaplar.
-- ---------------------------------------------------------------------------
create or replace function public.recalc_club_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_club uuid;
begin
  -- Hem eski hem yeni club_id'yi (varsa, farklıysa) güncelle.
  for affected_club in
    select unnest(array_remove(array[
      case when tg_op in ('UPDATE', 'DELETE') then old.club_id end,
      case when tg_op in ('UPDATE', 'INSERT') then new.club_id end
    ], null))
  loop
    update public.clubs c
    set member_count = (
      select count(*)
      from public.club_members m
      where m.club_id = affected_club
        and m.status = 'active'
    )
    where c.id = affected_club;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger club_members_recalc_count
  after insert or update of status, club_id or delete on public.club_members
  for each row
  execute function public.recalc_club_member_count();

-- ---------------------------------------------------------------------------
-- 3. Kapasite gating — bir üye 'active' olmadan önce çalışır.
--    owner rolü muaf (kulüp kurucusu kendi kulübüne her zaman girebilir; ödeme
--    web panelinde kurulumdan önce alınır, yine de tavuk-yumurta sorununu önler).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_club_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  club_capacity int;
  club_sub_status text;
  active_members int;
begin
  -- Yalnızca yeni/aktifleşen üyeler için geçerli.
  if new.status <> 'active' then
    return new;
  end if;

  -- owner muaf.
  if new.role = 'owner' then
    return new;
  end if;

  -- Zaten aktif olan bir satır AYNI kulüpte güncelleniyorsa kapasite tüketilmez.
  -- (Aktif üye başka kulübe taşınıyorsa hedef kulübün kapasitesi yine kontrol edilir.)
  if tg_op = 'UPDATE' and old.status = 'active' and old.club_id = new.club_id then
    return new;
  end if;

  select capacity, subscription_status
    into club_capacity, club_sub_status
  from public.clubs
  where id = new.club_id
  for update; -- eşzamanlı eklemelerde yarış durumunu kilitle

  if club_sub_status is distinct from 'active' then
    raise exception 'Kulüp aboneliği aktif değil (status=%). Yeni üye eklenemez.',
      club_sub_status
      using errcode = 'check_violation';
  end if;

  select count(*) into active_members
  from public.club_members
  where club_id = new.club_id
    and status = 'active';

  if active_members >= club_capacity then
    raise exception
      'Kulüp kapasitesi dolu (%/%). Devam için kapasiteyi artırın.',
      active_members, club_capacity
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger club_members_enforce_capacity
  before insert or update of status, club_id on public.club_members
  for each row
  execute function public.enforce_club_capacity();
