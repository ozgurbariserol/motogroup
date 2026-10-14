import 'server-only';

import { createHmac } from 'node:crypto';
import { getPaytrEnv } from '@/lib/env';

// PayTR iFrame API — token üretimi (server-only). Belge: https://dev.paytr.com/iframe-api
// Tüm hash'ler merchant_key ile HMAC-SHA256, merchant_salt eklenerek üretilir.

const GET_TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';

export type CheckoutParams = {
  merchantOid: string; // alfanümerik, benzersiz
  amount: number; // TL cinsinden (kuruşa burada çevrilir)
  email: string;
  userIp: string;
  userName: string;
  productLabel: string;
  okUrl: string;
  failUrl: string;
  testMode?: boolean;
};

/** PayTR iframe token'ı alır. Başarısızsa hata fırlatır. */
export async function createPaytrToken(params: CheckoutParams): Promise<string> {
  const { PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT } = getPaytrEnv();

  const paymentAmount = Math.round(params.amount * 100); // kuruş
  const noInstallment = '0';
  const maxInstallment = '0';
  const currency = 'TL';
  const testMode = params.testMode ? '1' : '0';

  // Sepet: [[ürün adı, fiyat, adet]]
  const basket = Buffer.from(
    JSON.stringify([[params.productLabel, params.amount.toFixed(2), 1]]),
  ).toString('base64');

  // paytr_token = base64( HMAC_SHA256( hashStr + merchant_salt, merchant_key ) )
  const hashStr =
    PAYTR_MERCHANT_ID +
    params.userIp +
    params.merchantOid +
    params.email +
    paymentAmount +
    basket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  const paytrToken = createHmac('sha256', PAYTR_MERCHANT_KEY)
    .update(hashStr + PAYTR_MERCHANT_SALT)
    .digest('base64');

  const body = new URLSearchParams({
    merchant_id: PAYTR_MERCHANT_ID,
    user_ip: params.userIp,
    merchant_oid: params.merchantOid,
    email: params.email,
    payment_amount: String(paymentAmount),
    paytr_token: paytrToken,
    user_basket: basket,
    debug_on: '1',
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: params.userName,
    user_address: 'MotoGroup',
    user_phone: '0000000000',
    merchant_ok_url: params.okUrl,
    merchant_fail_url: params.failUrl,
    timeout_limit: '30',
    currency,
    test_mode: testMode,
    lang: 'tr',
  });

  const res = await fetch(GET_TOKEN_URL, { method: 'POST', body });
  const json = (await res.json()) as { status: string; token?: string; reason?: string };

  if (json.status !== 'success' || !json.token) {
    throw new Error(`PayTR token alınamadı: ${json.reason ?? 'bilinmeyen hata'}`);
  }
  return json.token;
}

/** Webhook bildirimindeki hash'i doğrular (forge koruması). */
export function verifyPaytrCallback(
  merchantOid: string,
  status: string,
  totalAmount: string,
  hash: string,
): boolean {
  const { PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT } = getPaytrEnv();
  const expected = createHmac('sha256', PAYTR_MERCHANT_KEY)
    .update(merchantOid + PAYTR_MERCHANT_SALT + status + totalAmount)
    .digest('base64');
  return expected === hash;
}
