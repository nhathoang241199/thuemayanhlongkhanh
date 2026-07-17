import {
  buildPriceQuoteFromCamera,
  isDurationFollowUp,
  isPriceQuoteQuestion,
  matchCameraInText,
  parseDayCount,
  resolvePriceQuoteRequest,
  textContainsModel,
} from './messenger-price-quote';

const CAMERAS = [
  { id: '1', name: 'r50', brand: 'CANON', dayPrice: 450_000, shiftPrice: 250_000, discountPercent: 0 },
  { id: '2', name: 'm50', brand: 'CANON', dayPrice: 400_000, shiftPrice: 220_000, discountPercent: 0 },
  { id: '3', name: 'pocket 3', brand: 'DJI', dayPrice: 280_000, shiftPrice: 160_000, discountPercent: 0 },
  { id: '4', name: 'xt30', brand: 'FUJIFILM', dayPrice: 350_000, shiftPrice: 200_000, discountPercent: 0 },
  { id: '5', name: 'xt3', brand: 'FUJIFILM', dayPrice: 300_000, shiftPrice: 180_000, discountPercent: 0 },
];

describe('isPriceQuoteQuestion', () => {
  it('detects price questions', () => {
    expect(isPriceQuoteQuestion('em xin giá pocket3 giá 1 ngày ạ')).toBe(true);
    expect(isPriceQuoteQuestion('r50 2 ngày bao nhiêu')).toBe(true);
  });

  it('rejects non-price', () => {
    expect(isPriceQuoteQuestion('hi shop')).toBe(false);
    expect(isPriceQuoteQuestion('cách thuê máy')).toBe(false);
  });
});

describe('parseDayCount', () => {
  it('parses Vietnamese day count', () => {
    expect(parseDayCount('giá 1 ngày')).toBe(1);
    expect(parseDayCount('r50 2 ngày')).toBe(2);
    expect(parseDayCount('pocket 3 1 tuần giá bao nhiêu')).toBe(7);
  });

  it('returns null when missing', () => {
    expect(parseDayCount('giá r50')).toBeNull();
  });
});

describe('matchCameraInText', () => {
  it('matches model in message', () => {
    expect(matchCameraInText('xin giá pocket3 1 ngày', CAMERAS)?.name).toBe('pocket 3');
    expect(matchCameraInText('pocket 3 1 tuần giá bao nhiêu ạ', CAMERAS)?.name).toBe(
      'pocket 3',
    );
    expect(matchCameraInText('r50 giá 2 ngày', CAMERAS)?.name).toBe('r50');
  });

  it('prefers longer model name (xt30 over xt3)', () => {
    expect(matchCameraInText('giá xt30 1 ngày', CAMERAS)?.name).toBe('xt30');
    expect(matchCameraInText('giá xt3 1 ngày', CAMERAS)?.name).toBe('xt3');
  });

  it('avoids substring false positives', () => {
    expect(textContainsModel('br50 giá', 'r50')).toBe(false);
    expect(textContainsModel('r50 giá', 'r50')).toBe(true);
  });
});

describe('isDurationFollowUp', () => {
  it('detects short duration follow-ups', () => {
    expect(isDurationFollowUp('còn 3 ngày')).toBe(true);
    expect(isDurationFollowUp('thuê 2 ngày')).toBe(true);
  });

  it('rejects availability', () => {
    expect(isDurationFollowUp('còn máy 3 ngày không')).toBe(false);
  });
});

describe('resolvePriceQuoteRequest', () => {
  it('quotes from history when only duration changes', () => {
    const history = [
      { role: 'user' as const, content: 'giá pocket 3 1 ngày' },
      { role: 'assistant' as const, content: 'Pocket 3 1 ngày 280k nhé ạ.' },
    ];
    const req = resolvePriceQuoteRequest('còn 3 ngày', CAMERAS, history);
    expect(req?.camera.name).toBe('pocket 3');
    expect(req?.dayCount).toBe(3);
    expect(buildPriceQuoteFromCamera(req!.camera, req!.dayCount)).toBe(
      'Pocket 3 3 ngày 672k nhé ạ.',
    );
  });

  it('quotes from history when price follow-up only changes days', () => {
    const history = [
      { role: 'user' as const, content: 'anh còn r50 ngày mai không ạ' },
      {
        role: 'assistant' as const,
        content:
          'R50 Ngày mai còn nhé ạ, bạn lên http://localhost:3001/book đặt lịch giúp em nhé.',
      },
    ];
    const req = resolvePriceQuoteRequest(
      'giá 3 ngày bao nhiêu v anh',
      CAMERAS,
      history,
    );
    expect(req?.camera.name).toBe('r50');
    expect(req?.dayCount).toBe(3);
  });

  it('quotes model + days without price keyword', () => {
    const req = resolvePriceQuoteRequest('pocket 3 3 ngày', CAMERAS);
    expect(req?.dayCount).toBe(3);
  });
});

describe('buildPriceQuoteFromCamera', () => {
  it('formats 1-day pocket 3', () => {
    const cam = CAMERAS[2];
    expect(buildPriceQuoteFromCamera(cam, 1)).toBe('Pocket 3 1 ngày 280k nhé ạ.');
  });

  it('applies multi-day multiplier for r50', () => {
    const cam = CAMERAS[0];
    expect(buildPriceQuoteFromCamera(cam, 2)).toBe('R50 2 ngày 788k nhé ạ.');
  });

  it('quotes pocket 3 for one week', () => {
    const cam = CAMERAS[2];
    expect(buildPriceQuoteFromCamera(cam, 7)).toBe('Pocket 3 7 ngày 1.3tr nhé ạ.');
  });
});
