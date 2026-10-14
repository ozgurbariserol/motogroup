'use client';

import {
  DEFAULT_CAPACITY_TIERS,
  computeUpgradeAmount,
  tierCapacity,
  tierPrice,
  type BillingPeriod,
  type Club,
} from '@motogroup/shared';
import Script from 'next/script';
import { useState } from 'react';
import { startUpgrade } from './actions';

function fmt(v: number) {
  return new Intl.NumberFormat('tr-TR').format(v) + '₺';
}

export function UpgradePanel({ club }: { club: Club }) {
  // Mevcut kapasiteye eşit/üstü paketler (yenileme + yükseltme). Düşürme yok.
  const eligible = DEFAULT_CAPACITY_TIERS.filter((t) => tierCapacity(t) >= club.capacity);
  const defaultTier =
    eligible.find((t) => tierCapacity(t) > club.capacity) ?? eligible[eligible.length - 1];

  const [tierId, setTierId] = useState(defaultTier?.id ?? DEFAULT_CAPACITY_TIERS[0]!.id);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const selected = DEFAULT_CAPACITY_TIERS.find((t) => t.id === tierId)!;
  const isRenewal = tierCapacity(selected) === club.capacity;
  const amount = computeUpgradeAmount({
    tiers: DEFAULT_CAPACITY_TIERS,
    currentTierId: club.subscription_status === 'active' ? club.subscription_tier : null,
    currentExpiresAt: club.subscription_status === 'active' ? club.subscription_expires_at : null,
    newTierId: tierId,
    period,
  });

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const res = await startUpgrade({ clubId: club.id, tierId, period });
    setLoading(false);
    if (!res.ok) setError(res.error);
    else setToken(res.token);
  }

  if (token) {
    return (
      <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <Script
          src="https://www.paytr.com/js/iframeResizer.min.js"
          onLoad={() => {
            // @ts-expect-error PayTR global
            window.iFrameResize({}, '#paytriframe-upgrade');
          }}
        />
        <iframe
          src={`https://www.paytr.com/odeme/guest/${token}`}
          id="paytriframe-upgrade"
          frameBorder={0}
          style={{ width: '100%', minHeight: 600, display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <p className="muted" style={{ marginBottom: 12 }}>
        Mevcut paket: <strong>{club.subscription_tier ?? '—'}</strong> · {club.member_count} /{' '}
        {club.capacity} üye
      </p>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="label" style={{ margin: 0 }}>
          Yeni paket
        </span>
        <div className="segment">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button key={p} type="button" data-active={period === p} onClick={() => setPeriod(p)}>
              {p === 'monthly' ? 'Aylık' : 'Yıllık'}
            </button>
          ))}
        </div>
      </div>

      <div className="stack">
        {eligible.map((t) => {
          const limit = t.memberLimit === null ? 'Sınırsız üye' : `${t.memberLimit} üye`;
          const tag = tierCapacity(t) === club.capacity ? 'Yenileme' : 'Yükseltme';
          return (
            <label key={t.id} className="tier" data-selected={t.id === tierId}>
              <span className="row">
                <input
                  type="radio"
                  name="upgrade-tier"
                  checked={t.id === tierId}
                  onChange={() => setTierId(t.id)}
                  style={{ accentColor: 'var(--brand)' }}
                />
                <span>
                  <span style={{ fontWeight: 700 }}>{t.label}</span>
                  <span className="muted"> · {limit}</span>
                  <span className="pill pill-muted" style={{ marginLeft: 8 }}>
                    {tag}
                  </span>
                </span>
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                {fmt(tierPrice(t, period))}/{period === 'yearly' ? 'yıl' : 'ay'}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <div>
          <span className="muted" style={{ fontSize: 13 }}>
            {isRenewal ? 'Yenileme tutarı' : 'Yükseltme farkı'}
          </span>
          <div className="price" style={{ fontSize: 22 }}>
            {fmt(amount)}
          </div>
          {!isRenewal && club.subscription_status === 'active' ? (
            <span className="faint" style={{ fontSize: 12 }}>
              Kalan sürenin kredisi düşülmüştür
            </span>
          ) : null}
        </div>
        <button className="button" type="button" onClick={onSubmit} disabled={loading}>
          {loading ? 'Hazırlanıyor…' : 'Ödemeye geç →'}
        </button>
      </div>
    </div>
  );
}
