'use client';

import { DEFAULT_CAPACITY_TIERS, type BillingPeriod } from '@motogroup/shared';
import Link from 'next/link';
import Script from 'next/script';
import { useState } from 'react';
import { startCheckout } from './actions';

function formatPrice(value: number) {
  return new Intl.NumberFormat('tr-TR').format(value) + '₺';
}

export default function NewClubPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [motoType, setMotoType] = useState('');
  const [tierId, setTierId] = useState(DEFAULT_CAPACITY_TIERS[0]!.id);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await startCheckout({
      name,
      description: description || undefined,
      city: city || undefined,
      moto_type: motoType || undefined,
      tier_id: tierId,
      period,
    });
    setLoading(false);
    if ('error' in result) setError(result.error);
    else setPaytrToken(result.token);
  }

  if (paytrToken) {
    return (
      <>
        <Appbar />
        <div className="container">
          <p className="eyebrow">Son adım</p>
          <h1 className="h1">Ödeme</h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 16 }}>
            Ödemeni güvenli PayTR ekranında tamamla. Onay sunucumuza ulaşınca kulübün otomatik
            aktifleşir.
          </p>
          <Script
            src="https://www.paytr.com/js/iframeResizer.min.js"
            onLoad={() => {
              // @ts-expect-error — PayTR global iFrameResize
              window.iFrameResize({}, '#paytriframe');
            }}
          />
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <iframe
              src={`https://www.paytr.com/odeme/guest/${paytrToken}`}
              id="paytriframe"
              frameBorder={0}
              style={{ width: '100%', minHeight: 600, display: 'block' }}
            />
          </div>
        </div>
      </>
    );
  }

  const selectedTier = DEFAULT_CAPACITY_TIERS.find((t) => t.id === tierId)!;
  const total = period === 'yearly' ? selectedTier.yearlyPrice : selectedTier.monthlyPrice;

  return (
    <>
      <Appbar />
      <div className="container">
        <Link href="/dashboard" className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kulüplerim
        </Link>
        <p className="eyebrow" style={{ marginTop: 14 }}>
          Yeni kulüp
        </p>
        <h1 className="h1">Kulübünü kur</h1>

        <form className="card" onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <label className="label">Kulüp adı</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="örn. Anadolu Motosiklet Kulübü"
          />

          <label className="label">Açıklama</label>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kulübünü birkaç cümleyle anlat"
          />

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Şehir</label>
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="İstanbul"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Motor tipi</label>
              <input
                className="input"
                placeholder="adventure / touring…"
                value={motoType}
                onChange={(e) => setMotoType(e.target.value)}
              />
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 22 }}>
            <label className="label" style={{ margin: 0 }}>
              Kapasite paketi
            </label>
            <div className="segment">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-active={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'monthly' ? 'Aylık' : 'Yıllık'}
                </button>
              ))}
            </div>
          </div>

          <div className="stack" style={{ marginTop: 10 }}>
            {DEFAULT_CAPACITY_TIERS.map((tier) => {
              const price = period === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
              const limit = tier.memberLimit === null ? 'Sınırsız üye' : `${tier.memberLimit} üye`;
              return (
                <label key={tier.id} className="tier" data-selected={tier.id === tierId}>
                  <span className="row">
                    <input
                      type="radio"
                      name="tier"
                      checked={tier.id === tierId}
                      onChange={() => setTierId(tier.id)}
                      style={{ accentColor: 'var(--brand)' }}
                    />
                    <span>
                      <span style={{ fontWeight: 700 }}>{tier.label}</span>
                      <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                        {limit}
                      </span>
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="price">{formatPrice(price)}</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      /{period === 'yearly' ? 'yıl' : 'ay'}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {error && (
            <p className="error" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
            <div>
              <span className="muted" style={{ fontSize: 13 }}>
                Toplam
              </span>
              <div className="price" style={{ fontSize: 22 }}>
                {formatPrice(total)}
                <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>
                  {' '}
                  /{period === 'yearly' ? 'yıl' : 'ay'}
                </span>
              </div>
            </div>
            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Hazırlanıyor…' : 'Ödemeye geç →'}
            </button>
          </div>

          <p className="faint" style={{ marginTop: 14, fontSize: 12.5 }}>
            Ödeme PayTR ile güvenli alınır. Tutar ve kapasite seçtiğin pakete göre belirlenir.
          </p>
        </form>
      </div>
    </>
  );
}

function Appbar() {
  return (
    <header className="appbar">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">🏍️</span>
        MotoGroup
      </Link>
    </header>
  );
}
