import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

// Yerel Supabase'e karşı uçtan uca akış testleri (gerçek auth oturumları + RLS).
// Anahtarlar Supabase yerel geliştirme VARSAYILANLARIDIR (herkese açık, gizli değil);
// env ile override edilebilir.
const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const stamp = Date.now();

async function newUser(
  email: string,
  name: string,
): Promise<{ id: string; client: SupabaseClient }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'sifre123',
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error) throw error;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: 'sifre123' });
  if (sErr) throw sErr;
  return { id: data.user.id, client };
}

let owner: { id: string; client: SupabaseClient };
let member: { id: string; client: SupabaseClient };
let stranger: { id: string; client: SupabaseClient };
let clubId: string;
let eventId: string;

beforeAll(async () => {
  owner = await newUser(`e2e_owner_${stamp}@test.com`, 'Sahip');
  member = await newUser(`e2e_member_${stamp}@test.com`, 'Uye');
  stranger = await newUser(`e2e_stranger_${stamp}@test.com`, 'Yabanci');

  const { data: cid } = await admin.rpc('create_pending_club', {
    p_owner: owner.id,
    p_name: `E2E Kulup ${stamp}`,
    p_tier: 'starter',
    p_capacity: 50,
    p_amount: 500,
    p_period: 'monthly',
    p_merchant_oid: `E2E${stamp}`,
    p_city: 'Istanbul',
    p_moto_type: 'adventure',
  });
  clubId = cid as string;
  await admin.rpc('mark_subscription_paid', { p_merchant_oid: `E2E${stamp}` });
});

describe('Auth & onboarding', () => {
  it('profil trigger ile oluşur', async () => {
    const { data } = await owner.client
      .from('profiles')
      .select('display_name')
      .eq('id', owner.id)
      .single();
    expect(data?.display_name).toBe('Sahip');
  });

  it('onboarding: şehir + motosiklet (RLS kendi satırı)', async () => {
    await owner.client.from('profiles').update({ city: 'Istanbul' }).eq('id', owner.id);
    const { error } = await owner.client
      .from('motorcycles')
      .insert({ profile_id: owner.id, brand: 'Honda', model: 'Africa Twin', is_primary: true });
    expect(error).toBeNull();
  });
});

describe('Kulüp provizyon & üyelik', () => {
  it('webhook aktivasyonu kulübü active yapar (cap 50, owner üye)', async () => {
    const { data } = await owner.client
      .from('clubs')
      .select('subscription_status, capacity, member_count')
      .eq('id', clubId)
      .single();
    expect(data?.subscription_status).toBe('active');
    expect(data?.capacity).toBe(50);
    expect(data?.member_count).toBe(1);
  });

  it('üye katılır (pending) → owner onaylar (active) → member_count 2', async () => {
    const { error: joinErr } = await member.client
      .from('club_members')
      .insert({ club_id: clubId, profile_id: member.id, role: 'member' });
    expect(joinErr).toBeNull();

    const { error: appErr } = await owner.client
      .from('club_members')
      .update({ status: 'active' })
      .eq('club_id', clubId)
      .eq('profile_id', member.id);
    expect(appErr).toBeNull();

    const { data } = await owner.client
      .from('clubs')
      .select('member_count')
      .eq('id', clubId)
      .single();
    expect(data?.member_count).toBe(2);
  });

  it('üye kapasiteyi değiştiremez (RLS/trigger korur)', async () => {
    await member.client.from('clubs').update({ capacity: 9999 }).eq('id', clubId);
    const { data } = await owner.client.from('clubs').select('capacity').eq('id', clubId).single();
    expect(data?.capacity).toBe(50);
  });
});

describe('Etkinlik, RSVP, sohbet', () => {
  it('owner etkinlik oluşturur; üye oluşturamaz', async () => {
    const { data: ev, error } = await owner.client
      .from('events')
      .insert({
        club_id: clubId,
        creator_id: owner.id,
        title: 'Pazar Sürüşü',
        start_time: new Date(Date.now() + 86_400_000).toISOString(),
        meeting_location: 'SRID=4326;POINT(28.9784 41.0082)',
        meeting_address: 'Taksim',
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    eventId = ev!.id as string;

    const { error: hack } = await member.client.from('events').insert({
      club_id: clubId,
      creator_id: member.id,
      title: 'Izinsiz',
      start_time: new Date().toISOString(),
    });
    expect(hack).not.toBeNull();
  });

  it('üye RSVP + yorum + kulüp mesajı', async () => {
    const { error: rsvp } = await member.client
      .from('event_attendees')
      .upsert(
        { event_id: eventId, profile_id: member.id, status: 'going' },
        { onConflict: 'event_id,profile_id' },
      );
    expect(rsvp).toBeNull();

    const { error: cmt } = await member.client
      .from('event_comments')
      .insert({ event_id: eventId, profile_id: member.id, content: 'Geliyorum!' });
    expect(cmt).toBeNull();

    const { error: msg } = await member.client
      .from('messages')
      .insert({ club_id: clubId, sender_id: member.id, content: 'Selam' });
    expect(msg).toBeNull();
  });

  it('events_view PostGIS lat/lng döndürür', async () => {
    const { data } = await member.client
      .from('events_view')
      .select('meeting_lat, meeting_lng')
      .eq('id', eventId)
      .single();
    expect(Math.round(data!.meeting_lat as number)).toBe(41);
    expect(Math.round(data!.meeting_lng as number)).toBe(29);
  });
});

describe('Rota & favori & nearby', () => {
  it('rota oluştur, favorile, ST_DWithin ile bul', async () => {
    const { data: rt, error } = await owner.client
      .from('routes')
      .insert({
        creator_id: owner.id,
        club_id: clubId,
        title: 'Sile Turu',
        distance_km: 120.5,
        difficulty: 'orta',
        gpx_url: 'http://x/y.gpx',
        start_location: 'SRID=4326;POINT(29.6 41.17)',
      })
      .select('id')
      .single();
    expect(error).toBeNull();

    const { error: fav } = await member.client
      .from('route_favorites')
      .insert({ route_id: rt!.id, profile_id: member.id });
    expect(fav).toBeNull();

    const { data: near } = await member.client.rpc('routes_nearby', {
      p_lat: 41.17,
      p_lng: 29.6,
      p_radius_m: 50_000,
    });
    expect((near as { id: string }[]).some((r) => r.id === rt!.id)).toBe(true);
  });
});

describe('İzolasyon & yükseltme', () => {
  it('yabancı kulüp mesajını göremez (RLS)', async () => {
    const { data } = await stranger.client.from('messages').select('id').eq('club_id', clubId);
    expect(data?.length).toBe(0);
  });

  it('abonelik yükseltme: starter(50) → club(150)', async () => {
    const oid = `UPG${stamp}`;
    await admin.rpc('create_upgrade_subscription', {
      p_club_id: clubId,
      p_tier: 'club',
      p_capacity: 150,
      p_amount: 400,
      p_period: 'monthly',
      p_merchant_oid: oid,
    });
    await admin.rpc('mark_subscription_paid', { p_merchant_oid: oid });
    const { data } = await owner.client
      .from('clubs')
      .select('capacity, subscription_tier')
      .eq('id', clubId)
      .single();
    expect(data?.capacity).toBe(150);
    expect(data?.subscription_tier).toBe('club');
  });
});
