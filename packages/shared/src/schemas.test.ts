import { describe, expect, it } from 'vitest';
import { geoPointSchema } from './primitives';
import { messageSendSchema } from './schemas/message';
import { motorcycleCreateSchema } from './schemas/motorcycle';
import { checkoutInputSchema } from './schemas/subscription';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('messageSendSchema (kulüp/etkinlik tam biri)', () => {
  it('yalnızca club_id kabul eder', () => {
    expect(messageSendSchema.safeParse({ club_id: UUID, content: 'selam' }).success).toBe(true);
  });
  it('yalnızca event_id kabul eder', () => {
    expect(messageSendSchema.safeParse({ event_id: UUID, content: 'selam' }).success).toBe(true);
  });
  it('ikisi birden verilirse reddeder', () => {
    expect(
      messageSendSchema.safeParse({ club_id: UUID, event_id: UUID, content: 'x' }).success,
    ).toBe(false);
  });
  it('hiçbiri verilmezse reddeder', () => {
    expect(messageSendSchema.safeParse({ content: 'x' }).success).toBe(false);
  });
  it('boş içeriği reddeder', () => {
    expect(messageSendSchema.safeParse({ club_id: UUID, content: '   ' }).success).toBe(false);
  });
});

describe('motorcycleCreateSchema', () => {
  it('marka/model zorunlu', () => {
    expect(motorcycleCreateSchema.safeParse({ brand: 'Honda', model: 'Africa Twin' }).success).toBe(
      true,
    );
    expect(motorcycleCreateSchema.safeParse({ brand: 'Honda' }).success).toBe(false);
  });
  it('mantıksız yıl/cc reddedilir', () => {
    expect(motorcycleCreateSchema.safeParse({ brand: 'X', model: 'Y', year: 1800 }).success).toBe(
      false,
    );
    expect(motorcycleCreateSchema.safeParse({ brand: 'X', model: 'Y', cc: 99999 }).success).toBe(
      false,
    );
  });
});

describe('geoPointSchema', () => {
  it('geçerli koordinat', () => {
    expect(geoPointSchema.safeParse({ lat: 41, lng: 29 }).success).toBe(true);
  });
  it('aralık dışını reddeder', () => {
    expect(geoPointSchema.safeParse({ lat: 200, lng: 29 }).success).toBe(false);
  });
});

describe('checkoutInputSchema (client fiyat göndermez)', () => {
  it('yalnızca tier_id + period alır, tutar yok', () => {
    const parsed = checkoutInputSchema.safeParse({
      club_id: UUID,
      tier_id: 'club',
      period: 'monthly',
    });
    expect(parsed.success).toBe(true);
    // şemada amount/price alanı YOK
    expect(Object.keys(parsed.success ? parsed.data : {})).not.toContain('amount');
  });
});
