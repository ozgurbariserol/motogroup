-- 20260630000006_events_geo.sql
-- MotoGroup — etkinlik konum okuması için PostGIS yardımcıları.
--
-- geography(Point) kolonu PostgREST üzerinden hex EWKB döner; client lat/lng ister.
-- Bu yüzden lat/lng'yi açan bir VIEW (okuma) ve "yakınımdaki" için bir RPC ekliyoruz.
-- YAZMA: client doğrudan events tablosuna EWKT ('SRID=4326;POINT(lng lat)') yazar,
-- Postgres metni geography'e cast eder — ekstra RPC gerekmez.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- events_view — meeting_location'ı lat/lng olarak açar.
-- security_invoker=on: altta yatan events tablosunun RLS'i sorgulayan kullanıcıya
-- göre uygulanır (yalnızca üye olunan kulüplerin etkinlikleri görünür).
-- ---------------------------------------------------------------------------
create or replace view public.events_view
with (security_invoker = on) as
select
  e.id,
  e.club_id,
  e.creator_id,
  e.title,
  e.description,
  e.start_time,
  st_y(e.meeting_location::geometry) as meeting_lat,
  st_x(e.meeting_location::geometry) as meeting_lng,
  e.meeting_address,
  e.created_at
from public.events e;

-- ---------------------------------------------------------------------------
-- events_nearby — verilen noktanın radius_m metresi içindeki etkinlikler.
-- SECURITY INVOKER (varsayılan): events RLS uygulanır → yalnızca üye olunan
-- kulüplerin yakın etkinlikleri döner. Gelecek etkinlikler, mesafeye göre sıralı.
-- ---------------------------------------------------------------------------
create or replace function public.events_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 50000
)
returns table (
  id uuid,
  club_id uuid,
  creator_id uuid,
  title text,
  description text,
  start_time timestamptz,
  meeting_lat double precision,
  meeting_lng double precision,
  meeting_address text,
  created_at timestamptz,
  distance_m double precision
)
language sql
stable
as $$
  select
    e.id, e.club_id, e.creator_id, e.title, e.description, e.start_time,
    st_y(e.meeting_location::geometry) as meeting_lat,
    st_x(e.meeting_location::geometry) as meeting_lng,
    e.meeting_address, e.created_at,
    st_distance(
      e.meeting_location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.events e
  where e.meeting_location is not null
    and e.start_time >= now()
    and st_dwithin(
      e.meeting_location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m asc;
$$;
