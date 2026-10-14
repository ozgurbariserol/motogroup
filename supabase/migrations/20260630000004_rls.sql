-- 20260630000004_rls.sql
-- MotoGroup — Row Level Security (CLAUDE.md Bölüm 4 "Önemli kurallar").
--   * TÜM tablolarda RLS açık. Anon erişim yok (politikalar 'authenticated' rolüne).
--   * Kulüp içeriği (event/message/member) yalnızca o kulübün AKTİF üyelerine.
--   * Etkinlik/üye yönetimi yalnızca owner/admin.
--   * subscriptions yazımı yalnızca service_role (webhook) — politika yok.
--   * service_role tüm RLS'i bypass eder; client tarafı buradaki politikalarla sınırlı.

set search_path = public, extensions;

-- ===========================================================================
-- Yardımcı fonksiyonlar — SECURITY DEFINER ile RLS'i bypass eder; böylece
-- club_members'a bakan politikalar sonsuz özyinelemeye girmez.
-- ===========================================================================
create or replace function public.is_club_member(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = _club_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_club_admin(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = _club_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.clubs c
    where c.id = _club_id
      and c.owner_id = auth.uid()
  );
$$;

create or replace function public.is_event_member(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.club_members m on m.club_id = e.club_id
    where e.id = _event_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_event_admin(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = _event_id
      and public.is_club_admin(e.club_id)
  );
$$;

-- Mevcut kullanıcı, verilen profille en az bir AKTİF kulüpte birlikte mi?
-- (motorcycles gibi yarı-özel verinin yalnızca kulüp arkadaşlarına görünmesi için.)
create or replace function public.shares_active_club_with(_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_members me
    join public.club_members other on other.club_id = me.club_id
    where me.profile_id = auth.uid()
      and me.status = 'active'
      and other.profile_id = _profile_id
      and other.status = 'active'
  );
$$;

-- ===========================================================================
-- clubs: abonelik/kapasite kolonlarını client'tan koru.
-- capacity ve subscription_* yalnızca service_role (webhook/Edge Fn) tarafından
-- değiştirilebilir. (CLAUDE.md Bölüm 4: "Client'a güvenme".)
--
-- NOT: member_count BİLİNÇLİ olarak korunmaz — o, recalc_club_member_count trigger'ı
-- (sistem) tarafından güncellenir; korumaya alınırsa o trigger'ın meşru güncellemesi
-- (üye katıl/ayrıl) bloke olur. Kapasite gating member_count'a değil gerçek COUNT'a
-- dayandığından member_count'un kurcalanması güvenlik kontrolünü baypas etmez.
-- ===========================================================================
create or replace function public.protect_club_subscription_columns()
returns trigger
language plpgsql
as $$
begin
  -- service_role doğrudan, VEYA güvenilen SECURITY DEFINER fonksiyonu (mark_subscription_paid)
  -- işlem-yerel bayrağı set ettiyse serbest. Bu bayrak yalnızca sunucu fonksiyonlarından
  -- set edilebilir; PostgREST client'ı set_config çağıramaz, dolayısıyla baypas edemez.
  if (select auth.role()) = 'service_role'
     or current_setting('app.bypass_club_protect', true) = '1' then
    return new;
  end if;

  if new.capacity is distinct from old.capacity
     or new.subscription_status is distinct from old.subscription_status
     or new.subscription_tier is distinct from old.subscription_tier
     or new.subscription_expires_at is distinct from old.subscription_expires_at
  then
    raise exception
      'Abonelik/kapasite alanları yalnızca sunucu tarafından (PayTR webhook) güncellenir.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger clubs_protect_subscription_columns
  before update on public.clubs
  for each row
  execute function public.protect_club_subscription_columns();

-- ===========================================================================
-- RLS'i tüm tablolarda aç
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.motorcycles     enable row level security;
alter table public.clubs           enable row level security;
alter table public.club_members    enable row level security;
alter table public.events          enable row level security;
alter table public.event_attendees enable row level security;
alter table public.routes          enable row level security;
alter table public.route_favorites enable row level security;
alter table public.route_comments  enable row level security;
alter table public.event_comments  enable row level security;
alter table public.messages        enable row level security;
alter table public.subscriptions   enable row level security;

-- ===========================================================================
-- profiles
-- ===========================================================================
create policy "profiles: authenticated okur"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: kendi satırını ekler"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: kendi satırını günceller"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===========================================================================
-- motorcycles — okuma sahibi VEYA ortak aktif kulüp üyeleri; yazma yalnızca sahibi
-- (Tüm authenticated'a açık değil — gizlilik için kulüp arkadaşlarıyla sınırlı.)
-- ===========================================================================
create policy "motorcycles: sahibi veya kulüp arkadaşı okur"
  on public.motorcycles for select to authenticated
  using (profile_id = auth.uid() or shares_active_club_with(profile_id));

create policy "motorcycles: sahibi ekler"
  on public.motorcycles for insert to authenticated
  with check (profile_id = auth.uid());

create policy "motorcycles: sahibi günceller"
  on public.motorcycles for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "motorcycles: sahibi siler"
  on public.motorcycles for delete to authenticated
  using (profile_id = auth.uid());

-- ===========================================================================
-- clubs — keşfedilebilir (authenticated okur); yazım kurucu/admin
-- (abonelik kolonları yukarıdaki trigger ile korunur)
-- ===========================================================================
create policy "clubs: authenticated okur"
  on public.clubs for select to authenticated
  using (true);

create policy "clubs: kullanıcı kendi sahipliğinde kulüp oluşturur"
  on public.clubs for insert to authenticated
  with check (owner_id = auth.uid());

create policy "clubs: owner/admin günceller"
  on public.clubs for update to authenticated
  using (is_club_admin(id))
  with check (is_club_admin(id));

create policy "clubs: yalnızca owner siler"
  on public.clubs for delete to authenticated
  using (owner_id = auth.uid());

-- ===========================================================================
-- club_members — üye listesi yalnızca aktif üyelere; yönetim owner/admin
-- ===========================================================================
create policy "club_members: üye listesini aktif üyeler görür"
  on public.club_members for select to authenticated
  using (is_club_member(club_id) or profile_id = auth.uid());

-- Kendi katılım talebini (pending, member) oluşturabilir; admin de üye ekleyebilir.
create policy "club_members: katılım talebi veya admin ekler"
  on public.club_members for insert to authenticated
  with check (
    (profile_id = auth.uid() and role = 'member')
    or is_club_admin(club_id)
  );

create policy "club_members: owner/admin günceller"
  on public.club_members for update to authenticated
  using (is_club_admin(club_id))
  with check (is_club_admin(club_id));

create policy "club_members: kullanıcı ayrılır veya admin çıkarır"
  on public.club_members for delete to authenticated
  using (profile_id = auth.uid() or is_club_admin(club_id));

-- ===========================================================================
-- events — kulüp içeriği; okuma aktif üye, yönetim owner/admin
-- ===========================================================================
create policy "events: kulüp üyeleri okur"
  on public.events for select to authenticated
  using (is_club_member(club_id));

create policy "events: owner/admin oluşturur"
  on public.events for insert to authenticated
  with check (is_club_admin(club_id) and creator_id = auth.uid());

create policy "events: owner/admin günceller"
  on public.events for update to authenticated
  using (is_club_admin(club_id))
  with check (is_club_admin(club_id));

create policy "events: owner/admin siler"
  on public.events for delete to authenticated
  using (is_club_admin(club_id));

-- ===========================================================================
-- event_attendees — RSVP; kulüp üyesi görür, herkes kendi RSVP'sini yönetir
-- ===========================================================================
create policy "event_attendees: kulüp üyeleri okur"
  on public.event_attendees for select to authenticated
  using (is_event_member(event_id));

create policy "event_attendees: üye kendi RSVP'sini ekler"
  on public.event_attendees for insert to authenticated
  with check (profile_id = auth.uid() and is_event_member(event_id));

create policy "event_attendees: üye kendi RSVP'sini günceller"
  on public.event_attendees for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and is_event_member(event_id));

create policy "event_attendees: üye kendi RSVP'sini siler"
  on public.event_attendees for delete to authenticated
  using (profile_id = auth.uid());

-- ===========================================================================
-- routes — keşfedilebilir paylaşımlı içerik; yazım yalnızca oluşturan
-- (kulübe bağlı rota oluşturmak için o kulübe aktif üyelik gerekir)
-- ===========================================================================
create policy "routes: authenticated okur"
  on public.routes for select to authenticated
  using (true);

create policy "routes: oluşturan ekler"
  on public.routes for insert to authenticated
  with check (
    creator_id = auth.uid()
    and (club_id is null or is_club_member(club_id))
  );

create policy "routes: oluşturan günceller"
  on public.routes for update to authenticated
  using (creator_id = auth.uid())
  with check (
    creator_id = auth.uid()
    and (club_id is null or is_club_member(club_id))
  );

create policy "routes: oluşturan siler"
  on public.routes for delete to authenticated
  using (creator_id = auth.uid());

-- ===========================================================================
-- route_favorites — yalnızca kendi favorileri
-- ===========================================================================
create policy "route_favorites: kendi favorilerini görür"
  on public.route_favorites for select to authenticated
  using (profile_id = auth.uid());

create policy "route_favorites: kendi favorisini ekler"
  on public.route_favorites for insert to authenticated
  with check (profile_id = auth.uid());

create policy "route_favorites: kendi favorisini siler"
  on public.route_favorites for delete to authenticated
  using (profile_id = auth.uid());

-- ===========================================================================
-- route_comments — rota görülebiliyorsa okunur; yazım kendi adına
-- ===========================================================================
create policy "route_comments: authenticated okur"
  on public.route_comments for select to authenticated
  using (true);

create policy "route_comments: kendi adına yorum ekler"
  on public.route_comments for insert to authenticated
  with check (profile_id = auth.uid());

create policy "route_comments: kendi yorumunu siler"
  on public.route_comments for delete to authenticated
  using (profile_id = auth.uid());

-- ===========================================================================
-- event_comments — kulüp üyeleri okur/yazar; silme kendi veya admin
-- ===========================================================================
create policy "event_comments: kulüp üyeleri okur"
  on public.event_comments for select to authenticated
  using (is_event_member(event_id));

create policy "event_comments: üye kendi adına yorum ekler"
  on public.event_comments for insert to authenticated
  with check (profile_id = auth.uid() and is_event_member(event_id));

create policy "event_comments: kendi yorumu veya admin siler"
  on public.event_comments for delete to authenticated
  using (profile_id = auth.uid() or is_event_admin(event_id));

-- ===========================================================================
-- messages — kulüp içi + etkinlik içi sohbet (Realtime). Okuma yalnızca ilgili
-- kulüp/etkinlik üyelerine; gönderim kendi adına ve üyelikle.
-- ===========================================================================
create policy "messages: kulüp/etkinlik üyeleri okur"
  on public.messages for select to authenticated
  using (
    (club_id is not null and is_club_member(club_id))
    or (event_id is not null and is_event_member(event_id))
  );

create policy "messages: üye kendi adına mesaj gönderir"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (club_id is not null and is_club_member(club_id))
      or (event_id is not null and is_event_member(event_id))
    )
  );

create policy "messages: gönderen kendi mesajını siler"
  on public.messages for delete to authenticated
  using (
    sender_id = auth.uid()
    or (club_id is not null and is_club_admin(club_id))
    or (event_id is not null and is_event_admin(event_id))
  );

-- ===========================================================================
-- subscriptions — okuma yalnızca kulüp sahibine. Yazma politikası YOK:
-- yalnızca service_role (PayTR webhook / Edge Function) yazabilir (RLS bypass).
-- ===========================================================================
create policy "subscriptions: kulüp sahibi okur"
  on public.subscriptions for select to authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = subscriptions.club_id
        and c.owner_id = auth.uid()
    )
  );
