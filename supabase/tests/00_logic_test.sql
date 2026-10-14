-- MotoGroup — sunucu mantığı testleri (trigger / RPC / kapasite gating / CHECK).
-- Çalıştırma:  docker exec -i supabase_db_motogroup psql -U postgres -d postgres < bu_dosya
-- Idempotent: test verisini başta temizler. Başarısız assert exception fırlatır (CI fail).

\set ON_ERROR_STOP on
set client_min_messages to notice;

-- Önce kulübü sil (clubs.owner_id FK restrict olduğundan kullanıcı silinmeden önce).
delete from public.clubs where name = 'Cap Club';
delete from auth.users where email like 'logic_%@test.com';

insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','logic_u1@test.com','{"display_name":"U1"}'),
 ('22222222-2222-2222-2222-222222222222','logic_u2@test.com','{"display_name":"U2"}'),
 ('33333333-3333-3333-3333-333333333333','logic_u3@test.com','{"display_name":"U3"}');

-- T1: auth.users → profiles trigger
do $$ begin
  assert (select count(*) from public.profiles
          where id in ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222',
                       '33333333-3333-3333-3333-333333333333')) = 3,
    'handle_new_user profilleri olusturmali';
  raise notice 'PASS T1: handle_new_user -> profiles';
end $$;

-- T2: create_pending_club (kapasite 2) — adlandırılmış parametreler
select public.create_pending_club(
  p_owner => '11111111-1111-1111-1111-111111111111',
  p_name => 'Cap Club',
  p_tier => 'club',
  p_capacity => 2,
  p_amount => 900,
  p_period => 'monthly',
  p_merchant_oid => 'OIDCAP',
  p_city => 'Istanbul',
  p_moto_type => 'adventure');

do $$
declare cid uuid;
begin
  select id into cid from public.clubs where name='Cap Club';
  assert (select subscription_status from public.clubs where id=cid)='pending', 'kulup pending olmali';
  assert (select capacity from public.clubs where id=cid)=0, 'pending kapasite 0';
  assert (select member_count from public.clubs where id=cid)=1, 'owner member_count=1';
  assert exists(select 1 from public.subscriptions where paytr_merchant_oid='OIDCAP' and status='pending'),
    'bekleyen abonelik olmali';
  raise notice 'PASS T2: create_pending_club';
end $$;

-- T3: pending kulübe aktif üye eklenemez (subscription active değil)
do $$
declare cid uuid; blocked boolean := false;
begin
  select id into cid from public.clubs where name='Cap Club';
  begin
    insert into public.club_members(club_id,profile_id,role,status)
    values(cid,'22222222-2222-2222-2222-222222222222','member','active');
  exception when others then blocked := true;
  end;
  assert blocked, 'pending kulube aktif uye engellenmeliydi';
  raise notice 'PASS T3: pending kulube aktif uye engellendi';
end $$;

-- T4: ödeme onayı → aktivasyon
select public.mark_subscription_paid('OIDCAP');
do $$
declare cid uuid;
begin
  select id into cid from public.clubs where name='Cap Club';
  assert (select subscription_status from public.clubs where id=cid)='active', 'active olmali';
  assert (select capacity from public.clubs where id=cid)=2, 'kapasite 2 olmali';
  assert (select subscription_expires_at from public.clubs where id=cid) is not null, 'bitis tarihi';
  assert (select status from public.subscriptions where paytr_merchant_oid='OIDCAP')='paid', 'paid';
  raise notice 'PASS T4: mark_subscription_paid aktive etti';
end $$;

-- T5: kapasite içinde üye eklenebilir (1 < 2)
do $$
declare cid uuid;
begin
  select id into cid from public.clubs where name='Cap Club';
  insert into public.club_members(club_id,profile_id,role,status)
  values(cid,'22222222-2222-2222-2222-222222222222','member','active');
  assert (select member_count from public.clubs where id=cid)=2, 'member_count 2';
  raise notice 'PASS T5: kapasite icinde uye eklendi';
end $$;

-- T6: kapasite dolunca engellenir (2 >= 2)
do $$
declare cid uuid; blocked boolean := false;
begin
  select id into cid from public.clubs where name='Cap Club';
  begin
    insert into public.club_members(club_id,profile_id,role,status)
    values(cid,'33333333-3333-3333-3333-333333333333','member','active');
  exception when others then blocked := true;
  end;
  assert blocked, 'kapasite dolu engellenmeliydi';
  assert (select member_count from public.clubs where id=cid)=2, 'member_count hala 2';
  raise notice 'PASS T6: kapasite dolunca engellendi';
end $$;

-- T7: mark_subscription_paid idempotent
do $$ begin
  perform public.mark_subscription_paid('OIDCAP');
  raise notice 'PASS T7: mark_subscription_paid idempotent';
end $$;

-- T8: messages CHECK (tam biri hedef)
do $$
declare cid uuid; blocked boolean := false;
begin
  select id into cid from public.clubs where name='Cap Club';
  insert into public.messages(club_id,event_id,sender_id,content)
    values(cid,null,'11111111-1111-1111-1111-111111111111','gecerli');
  begin
    insert into public.messages(club_id,event_id,sender_id,content)
      values(null,null,'11111111-1111-1111-1111-111111111111','iki hedef null');
  exception when others then blocked := true;
  end;
  assert blocked, 'iki hedef de null engellenmeliydi';
  raise notice 'PASS T8: messages CHECK';
end $$;

-- T9: abonelik yükseltme (create_upgrade_subscription + mark_subscription_paid)
select public.create_upgrade_subscription(
  p_club_id => (select id from public.clubs where name='Cap Club'),
  p_tier => 'big_club', p_capacity => 400, p_amount => 600,
  p_period => 'monthly', p_merchant_oid => 'OIDUPG');
select public.mark_subscription_paid('OIDUPG');
do $$
declare cid uuid;
begin
  select id into cid from public.clubs where name='Cap Club';
  assert (select capacity from public.clubs where id=cid)=400, 'yukseltme sonrasi kapasite 400';
  assert (select subscription_tier from public.clubs where id=cid)='big_club', 'tier big_club';
  raise notice 'PASS T9: abonelik yukseltme';
end $$;

select '=== TUM MANTIK TESTLERI GECTI ===' as sonuc;
