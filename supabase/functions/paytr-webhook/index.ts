// PayTR ödeme bildirimi (webhook) — Supabase Edge Function (Deno).
//
// PayTR, ödeme sonucunu sunucudan sunucuya bu URL'e POST eder (x-www-form-urlencoded:
// merchant_oid, status, total_amount, hash, ...). Akış (CLAUDE.md Bölüm 4 & 7):
//   1) hash imzasını DOĞRULA (HMAC-SHA256, merchant_key + merchant_salt). Forge koruması.
//   2) status='success' ise mark_subscription_paid RPC'sini service_role ile çağır →
//      abonelik 'paid', kulüp kapasitesi + 'active' yazılır. Idempotent.
//   3) PayTR'ye düz metin "OK" döndür (yoksa tekrar dener).
//
// Gerekli secret'lar (supabase secrets set):
//   PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Edge runtime tarafından otomatik sağlanır.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const merchantKey = Deno.env.get('PAYTR_MERCHANT_KEY');
  const merchantSalt = Deno.env.get('PAYTR_MERCHANT_SALT');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!merchantKey || !merchantSalt || !supabaseUrl || !serviceRole) {
    console.error('paytr-webhook: eksik ortam değişkeni');
    return new Response('server misconfigured', { status: 500 });
  }

  const form = await req.formData();
  const merchantOid = String(form.get('merchant_oid') ?? '');
  const status = String(form.get('status') ?? '');
  const totalAmount = String(form.get('total_amount') ?? '');
  const hash = String(form.get('hash') ?? '');

  // 1) İmza doğrulama — token = base64(HMAC(merchant_oid + salt + status + total_amount, key))
  const expected = await hmacSha256Base64(
    merchantKey,
    merchantOid + merchantSalt + status + totalAmount,
  );
  if (expected !== hash) {
    console.warn('paytr-webhook: geçersiz hash', merchantOid);
    // Bilinçli: OK DÖNDÜRMÜYORUZ — forge edilmiş bildirim işlenmez.
    return new Response('PAYTR notification failed: bad hash', { status: 200 });
  }

  // 2) Başarılıysa kulübü aktive et (idempotent RPC).
  if (status === 'success') {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.rpc('mark_subscription_paid', {
      p_merchant_oid: merchantOid,
    });
    if (error) {
      console.error('paytr-webhook: aktivasyon hatası', error.message);
      // OK döndürmüyoruz ki PayTR tekrar denesin (geçici DB hatası olabilir).
      return new Response('activation failed', { status: 200 });
    }
  } else {
    // status 'failed' — kulüp 'pending' kalır, kapasite verilmez. Yine de OK ki tekrar gelmesin.
    console.log('paytr-webhook: ödeme başarısız', merchantOid);
  }

  // 3) PayTR "OK" bekler.
  return new Response('OK', { status: 200 });
});
