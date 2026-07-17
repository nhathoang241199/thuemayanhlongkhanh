import { cameraModelShortLabel } from './messenger-formatters';

describe('cameraModelShortLabel', () => {
  it('normalizes Canon short names', () => {
    expect(cameraModelShortLabel('CANON', 'm50')).toBe('M50');
    expect(cameraModelShortLabel('CANON', 'r50')).toBe('R50');
    expect(cameraModelShortLabel('CANON', 'r6 ii')).toBe('R6 II');
  });

  it('normalizes Fujifilm short names', () => {
    expect(cameraModelShortLabel('FUJIFILM', 'xt20')).toBe('XT20');
    expect(cameraModelShortLabel('FUJIFILM', 'xt30')).toBe('XT30');
    expect(cameraModelShortLabel('FUJIFILM', 'xt3')).toBe('XT3');
    expect(cameraModelShortLabel('FUJIFILM', 'xs10')).toBe('XS10');
    expect(cameraModelShortLabel('FUJIFILM', 'x-t5')).toBe('X-T5');
    expect(cameraModelShortLabel('FUJIFILM', 'x100vi')).toBe('X100VI');
  });

  it('normalizes DJI short names', () => {
    expect(cameraModelShortLabel('DJI', 'pocket 3')).toBe('Pocket 3');
    expect(cameraModelShortLabel('DJI', 'pocket3')).toBe('Pocket 3');
  });

  it('title-cases unknown models', () => {
    expect(cameraModelShortLabel('SONY', 'a7 iv')).toBe('A7 Iv');
  });
});
