-- 20260630000007_realtime.sql
-- MotoGroup — Realtime sohbet (CLAUDE.md Bölüm 5.3, 8 adım 7).
--
-- messages tablosunu supabase_realtime publication'ına ekler. postgres_changes
-- akışı RLS'e SAYGI DUYAR: client yalnızca SELECT politikasının izin verdiği
-- (yani üyesi olduğu kulüp/etkinlik) mesajları alır. Ayrı bir yetki koduna gerek yok.

alter publication supabase_realtime add table public.messages;

-- Realtime, postgres_changes olaylarında RLS politikasını değerlendirebilmek için satırın
-- TÜM kolonlarına ihtiyaç duyar. REPLICA IDENTITY FULL olmadan RLS'li tablolarda olaylar
-- abonelere ULAŞMAZ (yetkilendirme yapılamaz). Bu yüzden FULL zorunlu.
alter table public.messages replica identity full;
