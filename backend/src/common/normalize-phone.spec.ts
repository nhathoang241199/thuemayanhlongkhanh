import { normalizePhone } from './normalize-phone';

describe('normalizePhone', () => {
  it('keeps local 0-prefix', () => {
    expect(normalizePhone('0901234567')).toBe('0901234567');
    expect(normalizePhone('0901 234 567')).toBe('0901234567');
  });

  it('converts 84 without leading 0', () => {
    expect(normalizePhone('84901234567')).toBe('0901234567');
    expect(normalizePhone('+84 901 234 567')).toBe('0901234567');
  });

  it('converts 84 with redundant 0', () => {
    expect(normalizePhone('840901234567')).toBe('0901234567');
    expect(normalizePhone('0084901234567')).toBe('0901234567');
  });

  it('prepends 0 for 9-digit mobile without prefix', () => {
    expect(normalizePhone('901234567')).toBe('0901234567');
  });

  it('strips non-digits', () => {
    expect(normalizePhone('(0901) 234-567')).toBe('0901234567');
  });
});
