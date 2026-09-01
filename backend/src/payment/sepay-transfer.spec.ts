import {
  buildTransferContent,
  compactPaymentRef,
  extractBookingCodeFromTransferText,
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

  it('extractBookingCodeFromTransferText handles SePay prefix before SEVQR', () => {
    expect(
      extractBookingCodeFromTransferText('ZP7D96VQGBUI SEVQR DH20260901M8UB'),
    ).toBe('DH-20260901-M8UB');
  });
});
