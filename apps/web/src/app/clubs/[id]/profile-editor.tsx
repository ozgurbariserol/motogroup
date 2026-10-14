'use client';

import type { Club } from '@motogroup/shared';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { setClubLogo, updateClubProfile } from './actions';

export function ProfileEditor({ club }: { club: Club }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? '');
  const [city, setCity] = useState(club.city ?? '');
  const [motoType, setMotoType] = useState(club.moto_type ?? '');
  const [logoUrl, setLogoUrl] = useState(club.logo_url);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSave() {
    setMsg(null);
    start(async () => {
      const res = await updateClubProfile({
        clubId: club.id,
        data: {
          name,
          description: description || undefined,
          city: city || undefined,
          moto_type: motoType || undefined,
        },
      });
      if (!res.ok) setMsg({ kind: 'err', text: res.error });
      else {
        setMsg({ kind: 'ok', text: 'Kaydedildi.' });
        router.refresh();
      }
    });
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${club.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
      const res = await setClubLogo({ clubId: club.id, url: pub.publicUrl });
      if (!res.ok) throw new Error(res.error);
      setLogoUrl(pub.publicUrl);
      setMsg({ kind: 'ok', text: 'Logo güncellendi.' });
      router.refresh();
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Yükleme başarısız' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ gap: 16, marginBottom: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: logoUrl ? `center/cover url(${logoUrl})` : 'var(--brand-tint)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          {logoUrl ? '' : '🏍️'}
        </div>
        <div>
          <button
            className="button button-ghost"
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Yükleniyor…' : 'Logo yükle'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickLogo}
            style={{ display: 'none' }}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
            PNG/JPG, kare öneririz.
          </p>
        </div>
      </div>

      <label className="label">Kulüp adı</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="label">Açıklama</label>
      <textarea
        className="input"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Şehir</label>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Motor tipi</label>
          <input className="input" value={motoType} onChange={(e) => setMotoType(e.target.value)} />
        </div>
      </div>

      {msg && (
        <p className={msg.kind === 'err' ? 'error' : 'muted'} style={{ marginTop: 12 }}>
          {msg.text}
        </p>
      )}

      <button
        className="button"
        type="button"
        onClick={onSave}
        disabled={pending}
        style={{ marginTop: 16 }}
      >
        {pending ? 'Kaydediliyor…' : 'Profili kaydet'}
      </button>
    </div>
  );
}
