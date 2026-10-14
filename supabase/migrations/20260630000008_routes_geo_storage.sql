-- 20260630000008_routes_geo_storage.sql
-- MotoGroup — Rota (CLAUDE.md Bölüm 5.5, 8 adım 8).
--   1. GPX dosyaları için Storage bucket + RLS politikaları.
--   2. routes_view: start_location'ı lat/lng olarak açar (events_view ile aynı kalıp).
--   3. routes_nearby: PostGIS ST_DWithin ile yakın rotalar.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Storage: gpx bucket (public okuma — rotalar keşfedilebilir içerik).
--    Yazma yalnızca dosyayı kendi klasörüne ({auth.uid}/...) koyan kullanıcıya.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gpx', 'gpx', true)
on conflict (id) do nothing;

create policy "gpx: herkes okur"
  on storage.objects for select
  using (bucket_id = 'gpx');

create policy "gpx: sahibi kendi klasörüne yükler"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gpx'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "gpx: sahibi kendi dosyasını günceller"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'gpx'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "gpx: sahibi kendi dosyasını siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gpx'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 2. routes_view — start_location → lat/lng. security_invoker: routes RLS uygulanır
--    (rotalar authenticated'a açık keşif içeriği).
-- ---------------------------------------------------------------------------
create or replace view public.routes_view
with (security_invoker = on) as
select
  r.id,
  r.creator_id,
  r.club_id,
  r.title,
  r.description,
  r.distance_km,
  r.difficulty,
  r.moto_type,
  r.gpx_url,
  st_y(r.start_location::geometry) as start_lat,
  st_x(r.start_location::geometry) as start_lng,
  r.created_at
from public.routes r;

-- ---------------------------------------------------------------------------
-- 3. routes_nearby — başlangıç noktası verilen noktanın radius_m içinde olan rotalar.
-- ---------------------------------------------------------------------------
create or replace function public.routes_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 100000
)
returns table (
  id uuid,
  creator_id uuid,
  club_id uuid,
  title text,
  description text,
  distance_km numeric,
  difficulty text,
  moto_type text,
  gpx_url text,
  start_lat double precision,
  start_lng double precision,
  created_at timestamptz,
  distance_m double precision
)
language sql
stable
as $$
  select
    r.id, r.creator_id, r.club_id, r.title, r.description, r.distance_km,
    r.difficulty, r.moto_type, r.gpx_url,
    st_y(r.start_location::geometry) as start_lat,
    st_x(r.start_location::geometry) as start_lng,
    r.created_at,
    st_distance(
      r.start_location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.routes r
  where r.start_location is not null
    and st_dwithin(
      r.start_location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m asc;
$$;
