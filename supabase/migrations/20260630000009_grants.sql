-- 20260630000009_grants.sql
-- MotoGroup — rol yetkileri (PostgREST için zorunlu).
--
-- PostgREST 'authenticator' rolüyle bağlanır ve isteğe göre 'anon' / 'authenticated' /
-- 'service_role' rolüne geçer. Bu rollerin tablo/fonksiyon GRANT'i OLMADAN RLS bile
-- devreye girmez ("permission denied"). RLS politikaları erişimi kısıtlar; GRANT yalnızca
-- "kapıyı" açar.
--
-- anon: hiçbir tablo yetkisi YOK → "anon erişim yok" (CLAUDE.md Bölüm 4) korunur.
-- Politikalarımızın tamamı zaten 'to authenticated'.

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: DML açık, RLS kısıtlar. service_role: tam (zaten RLS bypass).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- RLS politikalarında ve RPC olarak çağrılan fonksiyonlar authenticated'a açık.
-- DİKKAT: create_pending_club / mark_subscription_paid BİLİNÇLİ olarak burada YOK —
-- onlar yalnızca service_role'e açıktır (migration 0005).
grant execute on function public.is_club_member(uuid) to anon, authenticated, service_role;
grant execute on function public.is_club_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_event_member(uuid) to anon, authenticated, service_role;
grant execute on function public.is_event_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.shares_active_club_with(uuid) to anon, authenticated, service_role;
grant execute on function public.events_nearby(double precision, double precision, double precision)
  to authenticated, service_role;
grant execute on function public.routes_nearby(double precision, double precision, double precision)
  to authenticated, service_role;
