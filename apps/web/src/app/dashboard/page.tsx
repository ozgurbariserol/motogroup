import { clubSchema, type Club } from '@motogroup/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from './actions';

const statusPill: Record<Club['subscription_status'], { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'pill-success' },
  pending: { label: 'Ödeme bekliyor', cls: 'pill-warning' },
  expired: { label: 'Süresi doldu', cls: 'pill-muted' },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('clubs')
    .select(
      'id, name, description, city, moto_type, logo_url, owner_id, capacity, member_count, subscription_status, subscription_tier, subscription_expires_at, created_at',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const clubs = z.array(clubSchema).parse(data ?? []);

  return (
    <>
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark">🏍️</span>
          MotoGroup
        </div>
        <form action={signOutAction}>
          <button className="button button-ghost" type="submit">
            Çıkış
          </button>
        </form>
      </header>

      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p className="eyebrow">Yönetim paneli</p>
            <h1 className="h1">Kulüplerim</h1>
          </div>
          <Link className="button" href="/clubs/new">
            + Yeni kulüp
          </Link>
        </div>

        {clubs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40 }}>🏍️</div>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Henüz kulübün yok
            </h2>
            <p className="muted" style={{ marginTop: 6, marginBottom: 18 }}>
              İlk kulübünü kurarak üyelerini ve etkinliklerini yönetmeye başla.
            </p>
            <Link className="button" href="/clubs/new">
              İlk kulübünü kur
            </Link>
          </div>
        )}

        <div className="stack">
          {clubs.map((club) => {
            const pill = statusPill[club.subscription_status];
            const pct =
              club.capacity > 0 ? Math.min(100, (club.member_count / club.capacity) * 100) : 0;
            return (
              <div key={club.id} className="card card-hover">
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div>
                    <h2 className="h2">{club.name}</h2>
                    <p className="muted" style={{ marginTop: 4 }}>
                      {club.city ?? 'Şehir belirtilmemiş'}
                      {club.moto_type ? ` · ${club.moto_type}` : ''}
                    </p>
                  </div>
                  <span className={`pill ${pill.cls}`}>
                    <span className="pill-dot" />
                    {pill.label}
                  </span>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="faint" style={{ fontSize: 13, fontWeight: 600 }}>
                      Kapasite
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {club.member_count} / {club.capacity}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: '#eef0f3',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--brand), var(--brand-strong))',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <Link
                    href={`/clubs/${club.id}`}
                    style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 14 }}
                  >
                    Üyeleri yönet →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
