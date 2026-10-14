import { clubSchema } from '@motogroup/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { MemberActions, PendingActions } from './member-actions';
import { ProfileEditor } from './profile-editor';
import { UpgradePanel } from './upgrade-panel';

const memberRowSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
  status: z.enum(['pending', 'active']),
  profile: z.object({ display_name: z.string(), city: z.string().nullable() }).nullable(),
});

const roleLabel = (r: string) => (r === 'owner' ? 'Kurucu' : r === 'admin' ? 'Yönetici' : 'Üye');

export default async function ClubManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; failed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Kulüp + yetki kontrolü
  const { data: clubRow } = await supabase
    .from('clubs')
    .select(
      'id, name, description, city, moto_type, logo_url, owner_id, capacity, member_count, subscription_status, subscription_tier, subscription_expires_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!clubRow) redirect('/dashboard');
  const club = clubSchema.parse(clubRow);

  const { data: myRowRaw } = await supabase
    .from('club_members')
    .select('role, status')
    .eq('club_id', id)
    .eq('profile_id', user.id)
    .maybeSingle();
  const myRow = z
    .object({ role: z.enum(['owner', 'admin', 'member']), status: z.enum(['pending', 'active']) })
    .nullable()
    .parse(myRowRaw);
  const isAdmin = myRow?.status === 'active' && (myRow.role === 'owner' || myRow.role === 'admin');
  if (!isAdmin) redirect('/dashboard');

  const { data: membersRaw } = await supabase
    .from('club_members')
    .select('profile_id, role, status, profile:profiles(display_name, city)')
    .eq('club_id', id)
    .order('role', { ascending: true });
  const all = z.array(memberRowSchema).parse(membersRaw ?? []);
  const pending = all.filter((m) => m.status === 'pending');
  const members = all.filter((m) => m.status === 'active');

  return (
    <>
      <header className="appbar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">🏍️</span>
          MotoGroup
        </Link>
      </header>

      <div className="container">
        <Link href="/dashboard" className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kulüplerim
        </Link>
        <p className="eyebrow" style={{ marginTop: 14 }}>
          {club.name}
        </p>
        <h1 className="h1">Kulüp yönetimi</h1>
        <p className="muted">
          {club.member_count} / {club.capacity} üye · {club.city ?? '—'}
        </p>

        {sp.paid ? (
          <p
            className="pill pill-success"
            style={{ marginTop: 16, padding: '10px 14px', fontSize: 14 }}
          >
            Ödeme alındı. Onay sunucumuza ulaşınca paketin güncellenir.
          </p>
        ) : null}
        {sp.failed ? (
          <p className="error" style={{ marginTop: 16 }}>
            Ödeme tamamlanamadı. Tekrar deneyebilirsin.
          </p>
        ) : null}

        <h2 className="h2" style={{ marginTop: 24 }}>
          Abonelik
        </h2>
        <UpgradePanel club={club} />

        <h2 className="h2" style={{ marginTop: 24 }}>
          Kulüp profili
        </h2>
        <ProfileEditor club={club} />

        <h2 className="h2" style={{ marginTop: 28 }}>
          Bekleyen talepler ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Bekleyen katılım talebi yok.
          </p>
        ) : (
          <div className="stack" style={{ marginTop: 12 }}>
            {pending.map((m) => (
              <div key={m.profile_id} className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{m.profile?.display_name ?? 'Üye'}</strong>
                    {m.profile?.city ? <span className="muted"> · {m.profile.city}</span> : null}
                  </div>
                  <PendingActions clubId={id} profileId={m.profile_id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="h2" style={{ marginTop: 28 }}>
          Üyeler ({members.length})
        </h2>
        <div className="stack" style={{ marginTop: 12 }}>
          {members.map((m) => (
            <div key={m.profile_id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{m.profile?.display_name ?? 'Üye'}</strong>
                  {m.profile_id === user.id ? <span className="muted"> (sen)</span> : null}
                  <span
                    className={`pill ${m.role === 'member' ? 'pill-muted' : 'pill-success'}`}
                    style={{ marginLeft: 8 }}
                  >
                    {roleLabel(m.role)}
                  </span>
                </div>
                {m.role !== 'owner' && m.profile_id !== user.id ? (
                  <MemberActions
                    clubId={id}
                    profileId={m.profile_id}
                    role={m.role as 'admin' | 'member'}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
