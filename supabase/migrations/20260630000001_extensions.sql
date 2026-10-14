-- 20260630000001_extensions.sql
-- MotoGroup — gerekli Postgres uzantıları (CLAUDE.md Bölüm 4).
--
-- Supabase'de uzantılar 'extensions' şemasına kurulur. PostGIS konum alanları
-- (geography Point, 4326) ve "yakınımdaki" sorguları (ST_DWithin) için zorunludur.

create schema if not exists extensions;

-- PostGIS: geography(Point, 4326) ve mekânsal sorgular (ST_DWithin vb.)
create extension if not exists postgis with schema extensions;

-- pgcrypto: gen_random_uuid() ile uuid PK üretimi.
create extension if not exists pgcrypto with schema extensions;
