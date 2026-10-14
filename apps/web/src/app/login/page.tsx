'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/browser';

const schema = z.object({
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter'),
});

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Form hatalı');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { data: { display_name: displayName || parsed.data.email.split('@')[0] } },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (err) throw err;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="brand" style={{ justifyContent: 'center', fontSize: 22 }}>
            <span className="brand-mark">🏍️</span>
            MotoGroup
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Kulübünü kur, üyelerini ve etkinliklerini yönet.
          </p>
        </div>

        <form className="card" onSubmit={onSubmit} style={{ padding: 24 }}>
          <p className="eyebrow">{mode === 'signin' ? 'Tekrar hoş geldin' : 'Hemen başla'}</p>
          <h1 className="h2" style={{ marginTop: 4, marginBottom: 4 }}>
            {mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
          </h1>

          {mode === 'signup' && (
            <>
              <label className="label">Görünen ad</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Adın"
              />
            </>
          )}

          <label className="label">E-posta</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />

          <label className="label">Şifre</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p className="error" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}

          <button
            className="button button-block"
            type="submit"
            disabled={loading}
            style={{ marginTop: 18 }}
          >
            {loading ? 'Lütfen bekleyin…' : mode === 'signup' ? 'Kayıt ol' : 'Giriş yap'}
          </button>
        </form>

        <p className="muted" style={{ textAlign: 'center', marginTop: 18 }}>
          {mode === 'signin' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            {mode === 'signin' ? 'Kayıt ol' : 'Giriş yap'}
          </button>
        </p>
      </div>
    </div>
  );
}
