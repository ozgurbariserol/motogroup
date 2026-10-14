import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAPACITY_TIERS,
  UNLIMITED_CAPACITY,
  computeUpgradeAmount,
  tierCapacity,
  tierPrice,
} from './constants';

const tier = (id: string) => DEFAULT_CAPACITY_TIERS.find((t) => t.id === id)!;
const now = new Date('2026-07-01T00:00:00Z');

describe('tierPrice / tierCapacity', () => {
  it('periyoda göre fiyat döner', () => {
    expect(tierPrice(tier('club'), 'monthly')).toBe(900);
    expect(tierPrice(tier('club'), 'yearly')).toBe(9000);
  });
  it('sınırsız paket kapasite sentinel döner', () => {
    expect(tierCapacity(tier('chapter'))).toBe(UNLIMITED_CAPACITY);
    expect(tierCapacity(tier('starter'))).toBe(50);
  });
});

describe('computeUpgradeAmount', () => {
  const base = { tiers: DEFAULT_CAPACITY_TIERS, period: 'monthly' as const, now };

  it('tam dönem kalmışken farkı tahsil eder (1500 - 900 = 600)', () => {
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: 'club',
        currentExpiresAt: '2026-07-31T00:00:00Z',
        newTierId: 'big_club',
      }),
    ).toBe(600);
  });

  it('yarı dönem kalmışken kredinin yarısını düşer (1500 - 450 = 1050)', () => {
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: 'club',
        currentExpiresAt: '2026-07-16T00:00:00Z',
        newTierId: 'big_club',
      }),
    ).toBe(1050);
  });

  it('aktif abonelik yoksa tam fiyat tahsil eder', () => {
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: null,
        currentExpiresAt: null,
        newTierId: 'big_club',
      }),
    ).toBe(1500);
  });

  it('süresi geçmiş abonelikte kredi 0 (tam fiyat)', () => {
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: 'club',
        currentExpiresAt: '2026-06-01T00:00:00Z', // geçmiş
        newTierId: 'big_club',
      }),
    ).toBe(1500);
  });

  it('aynı tier yenilemede kredi düşülür (yenileme bedeli azalır)', () => {
    // club → club, 30 gün tam kalan: 900 - 900 = 0
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: 'club',
        currentExpiresAt: '2026-07-31T00:00:00Z',
        newTierId: 'club',
      }),
    ).toBe(0);
  });

  it('yıllık periyotta yıllık fiyat ve 365 günlük orantı kullanır', () => {
    // big_club yıllık 15000, club yıllık 9000, ~182.5 gün kalan ≈ yarı kredi
    const amount = computeUpgradeAmount({
      tiers: DEFAULT_CAPACITY_TIERS,
      period: 'yearly',
      now,
      currentTierId: 'club',
      currentExpiresAt: '2026-12-31T00:00:00Z', // ~183 gün
      newTierId: 'big_club',
    });
    expect(amount).toBeGreaterThan(10000);
    expect(amount).toBeLessThan(15000);
  });

  it('negatif sonucu 0 ile sınırlar', () => {
    // küçük yeni paket + büyük kredi → 0
    expect(
      computeUpgradeAmount({
        ...base,
        currentTierId: 'chapter',
        currentExpiresAt: '2026-07-31T00:00:00Z',
        newTierId: 'starter',
      }),
    ).toBe(0);
  });
});
