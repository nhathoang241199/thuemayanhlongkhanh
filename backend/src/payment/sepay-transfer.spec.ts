import {
  buildTransferContent,
  collectWebhookSearchTexts,
  compactPaymentRef,
  extractAllBookingCodesFromTransferText,
  extractBookingCodeFromTransferText,
  isCompleteBookingCode,
  normalizeSePayPaymentCode,
} from './sepay-transfer';

describe('sepay-transfer', () => {
  it('buildTransferContent prefixes booking code', () => {
    expect(buildTransferContent('DH-20260520-ABCD')).toMatch(
      /^SEVQR DH-20260520-ABCD$/,
    );
  });

  it('extractBookingCodeFromTransferText handles dashed content', () => {
    expect(
      extractBookingCodeFromTransferText('SEVQR DH-20260520-ABCD chuyen coc'),
    ).toBe('DH-20260520-ABCD');
  });

  it('extractBookingCodeFromTransferText handles compact bank content', () => {
    const compact = `SEVQR${compactPaymentRef('DH-20260520-ABCD')}`;
    expect(extractBookingCodeFromTransferText(compact)).toBe('DH-20260520-ABCD');
  });

  it('extractBookingCodeFromTransferText handles CT DEN VietinBank prefix', () => {
    expect(
      extractBookingCodeFromTransferText(
        'CT DEN:922T26903N7D377G\nSEVQR DH20260903Y81B',
      ),
    ).toBe('DH-20260903-Y81B');
  });

  it('rejects truncated SePay payment codes like DH20260521', () => {
    expect(isCompleteBookingCode('DH20260521')).toBe(false);
    expect(normalizeSePayPaymentCode('DH20260521')).toBeNull();
    expect(normalizeSePayPaymentCode('DH20260521M9F2')).toBe('DH-20260521-M9F2');
    expect(extractAllBookingCodesFromTransferText('DH20260521')).toEqual([]);
  });

  it('extracts full code from content even when SePay code is truncated', () => {
    expect(
      extractBookingCodeFromTransferText('SEVQR DH20260521M9F2'),
    ).toBe('DH-20260521-M9F2');
    expect(
      collectWebhookSearchTexts([
        'CT DEN:922T2650ZT8RRD8V',
        'SEVQR DH20260521M9F2',
      ]).some((text) => extractBookingCodeFromTransferText(text) === 'DH-20260521-M9F2'),
    ).toBe(true);
  });
});
