import { buildPromotionFanpagePost } from './hermes-promotion-post';

describe('buildPromotionFanpagePost', () => {
  it('builds default Vietnamese post', () => {
    const msg = buildPromotionFanpagePost(
      {
        discountPercent: 20,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        targetCameraId: null,
      },
      'https://thuemayanhlongkhanh.com/book',
    );
    expect(msg).toContain('Giảm 20%');
    expect(msg).toContain('01/10/2026 – 31/10/2026');
    expect(msg).toContain('https://thuemayanhlongkhanh.com/book');
  });

  it('uses custom message when provided', () => {
    expect(
      buildPromotionFanpagePost(
        { discountPercent: 10, startDate: null, endDate: null, targetCameraId: null },
        'https://example.com/book',
        'Tháng sau giảm 20% nhé',
      ),
    ).toBe('Tháng sau giảm 20% nhé');
  });
});
