-- MotoGroup — RLS izolasyon testleri (rol + JWT claim ile gerçek yetki sınırları).
-- 00_logic_test.sql'in oluşturduğu Cap Club + üyeler üzerine çalışır; önce onu çalıştır.
-- Çalıştırma:  docker exec -i supabase_db_motogroup psql -U postgres -d postgres < bu_dosya

\set ON_ERROR_STOP on
set client_min_messages to notice;

-- u1 için motosiklet (postgres → RLS bypass; motorcycles RLS testinde kullanılır)
insert into public.motorcycles(profile_id,brand,model,is_primary)
select '11111111-1111-1111-1111-111111111111','Honda','Africa Twin',true
where not exists (select 1 from public.motorcycles
  where profile_id='11111111-1111-1111-1111-111111111111' and brand='Honda');

-- R1: u2 (aktif üye) kulüp mesajlarını okur
begin;
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.messages
          where club_id=(select id from public.clubs where name='Cap Club'))>=1, 'uye mesaj gormeli';
  raise notice 'PASS R1: uye kulup mesajini okur';
end $$;
rollback;

-- R2: u3 (üye değil) kulüp mesajlarını göremez
begin;
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.messages
          where club_id=(select id from public.clubs where name='Cap Club'))=0, 'uye olmayan gormemeli';
  raise notice 'PASS R2: uye olmayan kulup mesajini goremez';
end $$;
rollback;

-- R3: u3 mesaj gönderemez (RLS WITH CHECK)
begin;
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$
declare blocked boolean := false; cid uuid;
begin
  select id into cid from public.clubs where name='Cap Club';
  begin
    insert into public.messages(club_id,sender_id,content)
      values(cid,'33333333-3333-3333-3333-333333333333','izinsiz');
  exception when others then blocked := true;
  end;
  assert blocked, 'uye olmayan mesaj gonderememeli';
  raise notice 'PASS R3: uye olmayan mesaj gonderemez';
end $$;
rollback;

-- R4: motorcycles — u2 (ortak aktif kulüp) u1 motorunu görür
begin;
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.motorcycles
          where profile_id='11111111-1111-1111-1111-111111111111')>=1, 'kulup arkadasi gormeli';
  raise notice 'PASS R4: kulup arkadasi motoru gorur';
end $$;
rollback;

-- R5: motorcycles — u3 (ortak kulüp yok) u1 motorunu göremez
begin;
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.motorcycles
          where profile_id='11111111-1111-1111-1111-111111111111')=0, 'yabanci gormemeli';
  raise notice 'PASS R5: ortak kulubu olmayan motoru goremez';
end $$;
rollback;

-- R6: subscriptions — u1 (owner) okur, u2 (üye) okumaz
begin;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.subscriptions where paytr_merchant_oid='OIDCAP')>=1, 'owner gormeli';
  raise notice 'PASS R6a: owner aboneligi okur';
end $$;
rollback;
begin;
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.subscriptions where paytr_merchant_oid='OIDCAP')=0, 'uye gormemeli';
  raise notice 'PASS R6b: owner olmayan aboneligi goremez';
end $$;
rollback;

-- R7: clubs keşfedilebilir — u3 bile görür
begin;
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.clubs where name='Cap Club')=1, 'kulupler kesfedilebilir';
  raise notice 'PASS R7: kulupler kesfedilebilir';
end $$;
rollback;

select '=== TUM RLS TESTLERI GECTI ===' as sonuc;
