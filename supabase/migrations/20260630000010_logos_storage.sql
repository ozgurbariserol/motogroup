-- 20260630000010_logos_storage.sql
-- MotoGroup — kulüp logoları için Storage bucket + RLS.
--
-- Yol konvansiyonu: logos/{club_id}/logo-*.png
-- Okuma herkese açık (logolar keşif ekranlarında görünür). Yazma yalnızca o kulübün
-- owner/admin'ine (is_club_admin yardımcısıyla). clubs.logo_url kolonu zaten var;
-- şema değişikliği gerekmez.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: herkes okur"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: kulüp yöneticisi yükler"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "logos: kulüp yöneticisi günceller"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "logos: kulüp yöneticisi siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );
