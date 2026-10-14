-- 20260630000002_schema.sql
-- MotoGroup — çekirdek şema (CLAUDE.md Bölüm 4).
-- Konum alanları geography(Point, 4326). uuid PK'ler gen_random_uuid() ile.
-- RLS bu migration'da AÇILMAZ; politikalar ayrı migration'da (20260630000004_rls.sql).

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- profiles — auth.users'a 1-1
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  city        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Kullanıcı profili — auth.users ile 1-1 (id eşit).';

-- ---------------------------------------------------------------------------
-- motorcycles
-- ---------------------------------------------------------------------------
create table public.motorcycles (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  brand      text not null,
  model      text not null,
  year       int,
  cc         int,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index motorcycles_profile_id_idx on public.motorcycles (profile_id);

-- En fazla bir birincil motosiklet (profil başına).
create unique index motorcycles_one_primary_per_profile
  on public.motorcycles (profile_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- clubs
-- Abonelik alanları (capacity / subscription_*) yalnızca sunucu/webhook tarafından
-- güncellenir (bkz. RLS migration). Fiyat rakamları DB/config'den; burada yok.
-- ---------------------------------------------------------------------------
create table public.clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  city         text,
  moto_type    text, -- adventure/chopper/sport/touring/naked...
  logo_url     text,
  owner_id     uuid not null references public.profiles (id) on delete restrict,
  capacity     int not null default 0,
  member_count int not null default 0, -- denormalize; trigger ile güncellenir
  subscription_status text not null default 'pending'
    check (subscription_status in ('active', 'expired', 'pending')),
  subscription_tier   text,
  subscription_expires_at timestamptz,
  created_at   timestamptz not null default now()
);

create index clubs_owner_id_idx on public.clubs (owner_id);
create index clubs_city_idx on public.clubs (city);

-- ---------------------------------------------------------------------------
-- club_members
-- ---------------------------------------------------------------------------
create table public.club_members (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status     text not null default 'pending' check (status in ('pending', 'active')),
  joined_at  timestamptz not null default now(),
  unique (club_id, profile_id)
);

create index club_members_club_id_idx on public.club_members (club_id);
create index club_members_profile_id_idx on public.club_members (profile_id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs (id) on delete cascade,
  creator_id       uuid not null references public.profiles (id) on delete restrict,
  title            text not null,
  description      text,
  start_time       timestamptz not null,
  meeting_location geography(Point, 4326), -- harita pin
  meeting_address  text,
  created_at       timestamptz not null default now()
);

create index events_club_id_idx on public.events (club_id);
create index events_start_time_idx on public.events (start_time);
-- "Yakınımdaki etkinlik" mekânsal sorgular (ST_DWithin) için GiST.
create index events_meeting_location_idx on public.events using gist (meeting_location);

-- ---------------------------------------------------------------------------
-- event_attendees (RSVP)
-- ---------------------------------------------------------------------------
create table public.event_attendees (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status     text not null check (status in ('going', 'not_going', 'maybe')),
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index event_attendees_event_id_idx on public.event_attendees (event_id);
create index event_attendees_profile_id_idx on public.event_attendees (profile_id);

-- ---------------------------------------------------------------------------
-- routes — club_id nullable (kişisel rota olabilir)
-- ---------------------------------------------------------------------------
create table public.routes (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.profiles (id) on delete cascade,
  club_id        uuid references public.clubs (id) on delete set null,
  title          text not null,
  description    text,
  distance_km    numeric(8, 2),
  difficulty     text check (difficulty in ('kolay', 'orta', 'zor')),
  moto_type      text,
  gpx_url        text, -- Supabase Storage
  start_location geography(Point, 4326),
  created_at     timestamptz not null default now()
);

create index routes_creator_id_idx on public.routes (creator_id);
create index routes_club_id_idx on public.routes (club_id);
create index routes_start_location_idx on public.routes using gist (start_location);

-- ---------------------------------------------------------------------------
-- route_favorites
-- ---------------------------------------------------------------------------
create table public.route_favorites (
  route_id   uuid not null references public.routes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (route_id, profile_id)
);

create index route_favorites_profile_id_idx on public.route_favorites (profile_id);

-- ---------------------------------------------------------------------------
-- route_comments
-- ---------------------------------------------------------------------------
create table public.route_comments (
  id         uuid primary key default gen_random_uuid(),
  route_id   uuid not null references public.routes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index route_comments_route_id_idx on public.route_comments (route_id);

-- ---------------------------------------------------------------------------
-- event_comments
-- ---------------------------------------------------------------------------
create table public.event_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index event_comments_event_id_idx on public.event_comments (event_id);

-- ---------------------------------------------------------------------------
-- messages — kulüp içi + etkinlik içi sohbet. Realtime bu tablo üzerinden.
-- club_id ve event_id'den TAM BİRİ dolu olmalı.
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid references public.clubs (id) on delete cascade,
  event_id   uuid references public.events (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  constraint messages_exactly_one_target
    check ((club_id is not null) <> (event_id is not null))
);

create index messages_club_id_created_idx on public.messages (club_id, created_at);
create index messages_event_id_created_idx on public.messages (event_id, created_at);

-- ---------------------------------------------------------------------------
-- subscriptions — ödeme kayıtları (web / PayTR). Yalnızca sunucu/webhook yazar.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references public.clubs (id) on delete cascade,
  tier                text not null,
  capacity            int not null,
  amount              numeric(10, 2) not null,
  status              text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  paytr_merchant_oid  text unique,
  period              text not null check (period in ('monthly', 'yearly')),
  starts_at           timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index subscriptions_club_id_idx on public.subscriptions (club_id);
create index subscriptions_status_idx on public.subscriptions (status);
