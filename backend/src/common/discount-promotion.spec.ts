import {
  dateRangesOverlap,
  isShopPromotionActiveForRental,
  resolveEffectiveDiscountPercent,
} from './discount-promotion';

describe('dateRangesOverlap', () => {
  it('overlaps when ranges share a day', () => {
    expect(dateRangesOverlap('2026-06-28', '2026-06-29', '2026-06-01', '2026-06-30')).toBe(
      true,
    );
  });

  it('does not overlap when rental is after promo', () => {
    expect(dateRangesOverlap('2026-07-01', '2026-07-02', '2026-06-01', '2026-06-30')).toBe(
      false,
    );
  });

  it('overlaps on boundary day', () => {
    expect(dateRangesOverlap('2026-06-30', '2026-07-01', '2026-06-01', '2026-06-30')).toBe(
      true,
    );
  });

  it('rental fully covers promo', () => {
    expect(dateRangesOverlap('2026-05-01', '2026-07-31', '2026-06-01', '2026-06-30')).toBe(
      true,
    );
  });
});

describe('isShopPromotionActiveForRental', () => {
  const datedPromo = {
    discountPercent: 20,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  };

  it('active when rental overlaps promo window', () => {
    expect(
      isShopPromotionActiveForRental(datedPromo, '2026-06-28', '2026-06-29'),
    ).toBe(true);
  });

  it('inactive when rental is outside promo window', () => {
    expect(
      isShopPromotionActiveForRental(datedPromo, '2026-07-01', '2026-07-02'),
    ).toBe(false);
  });

  it('active for any rental when no dates set', () => {
    expect(
      isShopPromotionActiveForRental(
        { discountPercent: 15, startDate: null, endDate: null },
        '2026-12-01',
        '2026-12-02',
      ),
    ).toBe(true);
  });

  it('inactive when percent is zero', () => {
    expect(
      isShopPromotionActiveForRental(
        { discountPercent: 0, startDate: '2026-06-01', endDate: '2026-06-30' },
        '2026-06-15',
        '2026-06-16',
      ),
    ).toBe(false);
  });
});

describe('resolveEffectiveDiscountPercent', () => {
  const promo = {
    discountPercent: 20,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  };

  it('uses promo percent when rental overlaps', () => {
    expect(
      resolveEffectiveDiscountPercent(5, promo, '2026-06-28', '2026-06-29'),
    ).toBe(20);
  });

  it('uses equipment percent when rental does not overlap', () => {
    expect(
      resolveEffectiveDiscountPercent(5, promo, '2026-07-01', '2026-07-02'),
    ).toBe(5);
  });

  it('uses equipment percent when promo is null', () => {
    expect(resolveEffectiveDiscountPercent(10, null, '2026-06-15', '2026-06-16')).toBe(
      10,
    );
  });
});
